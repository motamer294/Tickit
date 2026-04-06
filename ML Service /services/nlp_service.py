import joblib
sentiment_model = joblib.load(r"models\sentiment_pipeline_lsvm.pkl")
def analysis_sentiment(text):
    result = sentiment_model.predict([text])[0]
    return result