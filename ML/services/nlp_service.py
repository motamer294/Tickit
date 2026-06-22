import os
import joblib

from services.feature_engineering import extract_sentiment_features

_BASE            = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
_sentiment_model = joblib.load(os.path.join(_BASE, 'sentiment_svm.pkl'))


def analysis_sentiment(text: str) -> str:
    """
    Returns 'positive', 'neutral', or 'negative'.
    Uses only ITSM-specific hand-crafted features (frustration markers,
    positive tone, caps, exclamation) — not sentence embeddings — because
    the explicit signals are more reliable than semantic meaning for
    classifying IT-ticket user tone.
    """
    X = extract_sentiment_features([text])
    return _sentiment_model.predict(X)[0]
