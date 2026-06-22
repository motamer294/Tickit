"""
Retrain only the sentiment classifier after relabeling.
Skips the expensive embedding pass for category/priority and FAISS rebuild.

Run from ML/ directory:
    python scripts/retrain_sentiment.py
"""

import sys
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.calibration import CalibratedClassifierCV

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.feature_engineering import extract_sentiment_features

DATASET_PATH = 'dataset/Synthetic_ITSM_Data_Ready.csv'
MODELS_DIR   = 'models'

SENTIMENT_MAP = {
    'Satisfied':    'positive',
    'Neutral':      'neutral',
    'Dissatisfied': 'negative',
}

C_GRID = [0.01, 0.1, 1, 10, 100]


def main():
    df = pd.read_csv(DATASET_PATH).dropna(subset=['Description', 'Survey results'])
    print(f"Loaded {len(df)} rows.")
    print(f"Label distribution:\n{df['Survey results'].value_counts().to_dict()}\n")

    raw_texts   = df['Description'].astype(str).tolist()
    y_sentiment = df['Survey results'].map(SENTIMENT_MAP).tolist()

    # Sentiment uses only hand-crafted features — not embeddings.
    # The labels were derived from the same word signals, so embeddings
    # only add 384-dim noise that drowns out the 5 explicit features.
    print("Extracting sentiment features...")
    X = extract_sentiment_features(raw_texts)

    tr_idx, te_idx = train_test_split(
        np.arange(len(df)), test_size=0.2, random_state=42, stratify=y_sentiment
    )
    X_train = X[tr_idx];  y_train = [y_sentiment[i] for i in tr_idx]
    X_test  = X[te_idx];  y_test  = [y_sentiment[i] for i in te_idx]

    print(f"\nTrain: {len(y_train)}  |  Test: {len(y_test)}")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    gs = GridSearchCV(
        LinearSVC(class_weight='balanced', max_iter=3000, dual='auto'),
        param_grid={'C': C_GRID},
        cv=cv,
        scoring='f1_macro',
        n_jobs=-1,
        verbose=0,
    )
    gs.fit(X_train, y_train)
    print(f"Best C={gs.best_params_['C']}  (CV macro F1={gs.best_score_*100:.1f}%)")

    model = CalibratedClassifierCV(gs.best_estimator_, cv=3, method='isotonic')
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc   = accuracy_score(y_test, preds) * 100
    f1    = f1_score(y_test, preds, average='macro') * 100

    print("\nSentiment — Classification Report:")
    print(classification_report(y_test, preds))
    print(f"Accuracy: {acc:.1f}%   Macro F1: {f1:.1f}%")

    joblib.dump(model, f'{MODELS_DIR}/sentiment_svm.pkl')
    print(f"\nSaved to {MODELS_DIR}/sentiment_svm.pkl")


if __name__ == '__main__':
    main()
