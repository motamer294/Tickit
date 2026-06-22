import os
import joblib
import numpy as np
from scipy.sparse import hstack, csr_matrix

from services.embedder import get_embedder
from services.feature_engineering import extract_priority_features

_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')

_embedder       = get_embedder()
_tfidf          = joblib.load(os.path.join(_BASE, 'tfidf_vectorizer.pkl'))
_category_model = joblib.load(os.path.join(_BASE, 'category_svm.pkl'))
_priority_model = joblib.load(os.path.join(_BASE, 'priority_svm.pkl'))


def predict_ml(cleaned_text: str):
    """
    Returns (category, priority) for a pre-cleaned ticket text.
    Both values are now actively used (fixes the discarded-priority bug).
    """
    embedding = _embedder.encode([cleaned_text], convert_to_numpy=True)

    # Category: TF-IDF bigrams + embeddings
    tfidf_feat = _tfidf.transform([cleaned_text])
    cat_X      = hstack([csr_matrix(embedding), tfidf_feat])
    category   = _category_model.predict(cat_X)[0]

    # Priority: embeddings + hand-crafted urgency features (uses raw text)
    prio_feat = extract_priority_features([cleaned_text])
    pri_X     = np.hstack([embedding, prio_feat])
    priority  = _priority_model.predict(pri_X)[0]

    return category, priority
