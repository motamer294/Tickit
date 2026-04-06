import joblib
category_model=joblib.load(r"models\category_pipeline_lr.pkl")
priority_model=joblib.load(r"models\priority_pipeline_lsvm.pkl")
def predict_ml(text):
    category = category_model.predict([text])[0]
    priority = priority_model.predict([text])[0]
    return category, priority