import joblib
import os

# Use os.path.join to ensure cross-platform compatibility (Linux vs Windows paths)
CATEGORY_MODEL_PATH = os.path.join("models", "category_pipeline_lr.pkl")
PRIORITY_MODEL_PATH = os.path.join("models", "priority_pipeline_lsvm.pkl")

# Load pre-trained models
category_model = joblib.load(CATEGORY_MODEL_PATH)
priority_model = joblib.load(PRIORITY_MODEL_PATH)

def predict_ml(cleaned_text):
    """
    Predicts the Category (Topic) and Priority of a given cleaned text.
    Returns the actual string labels (e.g., 'Network Issue', 'High').
    """
    # The models take a list of strings, so we wrap the text in a list
    category = category_model.predict([cleaned_text])[0]
    priority = priority_model.predict([cleaned_text])[0]
    
    return category, priority