import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import make_pipeline
import joblib
import os

CSV_FILE_PATH = 'dataset/Synthetic_ITSM_Data_Ready.csv'

def train_and_save_models():
    print(f"Loading data from {CSV_FILE_PATH}...")
    try:
        df = pd.read_csv(CSV_FILE_PATH)
    except FileNotFoundError:
        print(f"Error: File {CSV_FILE_PATH} not found!")
        return

    # 1. Basic data cleaning
    df = df.dropna(subset=['Description', 'Topic', 'Priority'])

    # 2. Prepare inputs (X) and outputs (y)
    # Combine title with description because this is what happens in the Django API
    X = df['Topic'].astype(str).str.strip() + ". " + df['Description'].astype(str).str.strip()
    
    # Category is the same as Topic in your dataset
    y_category = df['Topic'].astype(str).str.strip()
    
    # Standardize priority format so it's always capitalized (LOW, MEDIUM, HIGH, CRITICAL)
    y_priority = df['Priority'].astype(str).str.strip().str.upper()

    print("Training Category Model (Logistic Regression)...")
    # TF-IDF to convert text to numbers, with Logistic Regression for classification
    cat_pipeline = make_pipeline(
        TfidfVectorizer(stop_words='english', max_features=5000),
        LogisticRegression(max_iter=1000)
    )
    cat_pipeline.fit(X, y_category)

    print("Training Priority Model (Linear SVM)...")
    # LinearSVC is excellent and very fast for Priority classification
    pri_pipeline = make_pipeline(
        TfidfVectorizer(stop_words='english', max_features=5000),
        LinearSVC(max_iter=2000, dual="auto")
    )
    pri_pipeline.fit(X, y_priority)

    # 3. Save models in the models folder
    os.makedirs('models', exist_ok=True)
    joblib.dump(cat_pipeline, 'models/category_pipeline_lr.pkl')
    joblib.dump(pri_pipeline, 'models/priority_pipeline_lsvm.pkl')

    print("="*50)
    print("Models trained and saved successfully!")
    print("Check the 'models/' directory for your .pkl files.")
    print("="*50)

if __name__ == "__main__":
    train_and_save_models()