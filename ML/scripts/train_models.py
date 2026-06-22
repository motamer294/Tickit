"""
Train category, priority, and sentiment classifiers using sentence-transformer
embeddings + hand-crafted features + GridSearchCV hyperparameter tuning.
Then rebuild the FAISS index for the RAG service.

Run from the ML/ directory:
    python scripts/train_models.py
"""

import sys
import os
import time
import json
import pickle
import joblib
import numpy as np
import pandas as pd
import faiss
from scipy.sparse import hstack, csr_matrix
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.calibration import CalibratedClassifierCV

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.text_cleaner import clean_text_list
from services.feature_engineering import extract_priority_features, extract_sentiment_features
from services.embedder import get_embedder

DATASET_PATH = 'dataset/Synthetic_ITSM_Data_Ready.csv'
MODELS_DIR   = 'models'

SENTIMENT_MAP = {
    'Satisfied':    'positive',
    'Neutral':      'neutral',
    'Dissatisfied': 'negative',
}

C_GRID = [0.01, 0.1, 1, 10, 100]
CV_FOLDS = 5


def section(title: str):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)


def evaluate(name: str, model, X_test, y_test):
    preds = model.predict(X_test)
    acc   = accuracy_score(y_test, preds) * 100
    f1    = f1_score(y_test, preds, average='macro') * 100
    print(f"\n{name}")
    print(classification_report(y_test, preds))
    print(f"  Accuracy: {acc:.1f}%   Macro F1: {f1:.1f}%")
    return acc, f1


def best_svc(X_train, y_train, scoring='f1_macro') -> CalibratedClassifierCV:
    """GridSearch LinearSVC → wrap in CalibratedClassifierCV for predict_proba support."""
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)
    gs = GridSearchCV(
        LinearSVC(class_weight='balanced', max_iter=3000, dual='auto'),
        param_grid={'C': C_GRID},
        cv=cv,
        scoring=scoring,
        n_jobs=-1,
        verbose=0,
    )
    gs.fit(X_train, y_train)
    print(f"  Best C={gs.best_params_['C']}  (CV {scoring}={gs.best_score_*100:.1f}%)")
    calibrated = CalibratedClassifierCV(gs.best_estimator_, cv=3, method='isotonic')
    calibrated.fit(X_train, y_train)
    return calibrated


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    # ── Load & clean ──────────────────────────────────────────────────────────
    section("Loading dataset")
    df = pd.read_csv(DATASET_PATH).dropna(subset=['Description', 'Topic', 'Priority', 'Survey results'])
    print(f"  Rows: {len(df)}")

    raw_texts = df['Description'].astype(str).tolist()

    print("  Cleaning text...")
    t0 = time.time()
    cleaned = clean_text_list(raw_texts)
    print(f"  Done in {time.time()-t0:.1f}s")

    y_category  = df['Topic'].str.strip().tolist()
    y_priority  = df['Priority'].str.strip().str.upper().tolist()
    y_sentiment = df['Survey results'].map(SENTIMENT_MAP).tolist()

    # ── Embeddings ────────────────────────────────────────────────────────────
    section("Generating sentence embeddings")
    embedder = get_embedder()
    t0 = time.time()
    embeddings = embedder.encode(
        cleaned,
        batch_size=128,
        show_progress_bar=True,
        convert_to_numpy=True,
    )
    print(f"  Shape: {embeddings.shape}  |  Time: {time.time()-t0:.1f}s")

    # ── Hand-crafted features ─────────────────────────────────────────────────
    section("Extracting hand-crafted features")
    prio_feats = extract_priority_features(raw_texts)   # uses raw text (urgency words)
    sent_feats = extract_sentiment_features(raw_texts)
    print(f"  Priority features shape:  {prio_feats.shape}")
    print(f"  Sentiment features shape: {sent_feats.shape}")

    # ── TF-IDF bigrams for category ───────────────────────────────────────────
    section("Fitting TF-IDF (bigrams) for category")
    tfidf = TfidfVectorizer(ngram_range=(1, 2), max_features=15000, sublinear_tf=True)
    tfidf_sparse = tfidf.fit_transform(cleaned)
    joblib.dump(tfidf, f'{MODELS_DIR}/tfidf_vectorizer.pkl')
    print(f"  TF-IDF shape: {tfidf_sparse.shape}")

    # category feature matrix: embeddings (dense→sparse) + TF-IDF (sparse)
    cat_X = hstack([csr_matrix(embeddings), tfidf_sparse])
    # priority & sentiment: embeddings + hand-crafted (both dense)
    pri_X = np.hstack([embeddings, prio_feats])
    sen_X = np.hstack([embeddings, sent_feats])

    # ── Train/test split ──────────────────────────────────────────────────────
    indices = np.arange(len(df))
    tr_idx, te_idx = train_test_split(indices, test_size=0.2, random_state=42, stratify=y_category)

    # ── Category ──────────────────────────────────────────────────────────────
    section("Training CATEGORY classifier")
    cat_train = cat_X[tr_idx]
    cat_test  = cat_X[te_idx]
    y_cat_tr  = [y_category[i] for i in tr_idx]
    y_cat_te  = [y_category[i] for i in te_idx]

    print(f"  Train: {len(y_cat_tr)}  |  Test: {len(y_cat_te)}")
    cat_model = best_svc(cat_train, y_cat_tr)
    cat_acc, cat_f1 = evaluate("Category", cat_model, cat_test, y_cat_te)
    joblib.dump(cat_model, f'{MODELS_DIR}/category_svm.pkl')

    # ── Priority ──────────────────────────────────────────────────────────────
    section("Training PRIORITY classifier")
    pri_train = pri_X[tr_idx]
    pri_test  = pri_X[te_idx]
    y_pri_tr  = [y_priority[i] for i in tr_idx]
    y_pri_te  = [y_priority[i] for i in te_idx]

    print(f"  Train: {len(y_pri_tr)}  |  Test: {len(y_pri_te)}")
    pri_model = best_svc(pri_train, y_pri_tr)
    pri_acc, pri_f1 = evaluate("Priority", pri_model, pri_test, y_pri_te)
    joblib.dump(pri_model, f'{MODELS_DIR}/priority_svm.pkl')

    # ── Sentiment ─────────────────────────────────────────────────────────────
    section("Training SENTIMENT classifier")
    sen_train = sen_X[tr_idx]
    sen_test  = sen_X[te_idx]
    y_sen_tr  = [y_sentiment[i] for i in tr_idx]
    y_sen_te  = [y_sentiment[i] for i in te_idx]

    print(f"  Train: {len(y_sen_tr)}  |  Test: {len(y_sen_te)}")
    sen_model = best_svc(sen_train, y_sen_tr)
    sen_acc, sen_f1 = evaluate("Sentiment", sen_model, sen_test, y_sen_te)
    joblib.dump(sen_model, f'{MODELS_DIR}/sentiment_svm.pkl')

    # ── Summary ───────────────────────────────────────────────────────────────
    section("Results Summary")
    print(f"  {'Task':<12}  {'Accuracy':>10}  {'Macro F1':>10}")
    print(f"  {'-'*36}")
    print(f"  {'Category':<12}  {cat_acc:>9.1f}%  {cat_f1:>9.1f}%")
    print(f"  {'Priority':<12}  {pri_acc:>9.1f}%  {pri_f1:>9.1f}%")
    print(f"  {'Sentiment':<12}  {sen_acc:>9.1f}%  {sen_f1:>9.1f}%")

    # ── Rebuild FAISS index ───────────────────────────────────────────────────
    section("Rebuilding FAISS index (10k tickets)")
    faqs = df.to_dict('records')
    faiss_texts = [
        f"{r.get('Description','')} {r.get('Resolution','')}" for r in faqs
    ]
    print(f"  Encoding {len(faiss_texts)} tickets...")
    t0 = time.time()
    faiss_embeddings = embedder.encode(
        faiss_texts,
        batch_size=128,
        show_progress_bar=True,
        convert_to_numpy=True,
    )
    dim = faiss_embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(faiss_embeddings.astype('float32'))
    with open(f'{MODELS_DIR}/faiss_index.pkl', 'wb') as f:
        pickle.dump(index, f)
    with open(f'{MODELS_DIR}/faq_data.pkl', 'wb') as f:
        pickle.dump(faqs, f)
    with open(f'{MODELS_DIR}/faq_embeddings.pkl', 'wb') as f:
        pickle.dump(faiss_embeddings, f)
    print(f"  FAISS index built ({len(faqs)} vectors, dim={dim}) in {time.time()-t0:.1f}s")

    # ── Save config ───────────────────────────────────────────────────────────
    with open(f'{MODELS_DIR}/embedding_config.json', 'w') as f:
        json.dump({'model': 'all-MiniLM-L6-v2'}, f)

    section("All models saved to models/")
    for fname in ['category_svm.pkl', 'priority_svm.pkl', 'sentiment_svm.pkl',
                  'tfidf_vectorizer.pkl', 'faiss_index.pkl', 'faq_data.pkl']:
        path = f'{MODELS_DIR}/{fname}'
        size = os.path.getsize(path) / 1024
        print(f"  {fname:<28}  {size:>8.1f} KB")


if __name__ == '__main__':
    main()
