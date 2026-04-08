import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import make_pipeline
from services.text_cleaner import clean_text_list

def train_and_save_models():
    print("📂 Loading dataset...")
    df = pd.read_csv('dataset/Synthetic_ITSM_Data_Ready.csv')
    
    # Drop any empty rows just to be safe
    df = df.dropna(subset=['Description', 'Topic', 'Priority'])
    
    print("🧹 Cleaning text data...")
    # Clean the 'Description' column which contains the user's issue
    X_clean = clean_text_list(df['Description'].tolist())
    
    y_category = df['Topic']
    y_priority = df['Priority']
    
    # 1. Train Category Model (Logistic Regression)
    print("🧠 Training Category Model (Logistic Regression)...")
    category_pipeline = make_pipeline(
        TfidfVectorizer(max_features=5000),
        LogisticRegression(max_iter=1000)
    )
    category_pipeline.fit(X_clean, y_category)
    
    # 2. Train Priority Model (Linear SVM)
    print("⚡ Training Priority Model (Linear SVM)...")
    priority_pipeline = make_pipeline(
        TfidfVectorizer(max_features=5000),
        LinearSVC(max_iter=1000)
    )
    priority_pipeline.fit(X_clean, y_priority)
    
    # Save the models to disk
    os.makedirs('models', exist_ok=True)
    joblib.dump(category_pipeline, 'models/category_pipeline_lr.pkl')
    joblib.dump(priority_pipeline, 'models/priority_pipeline_lsvm.pkl')
    print("✅ Models trained and saved successfully in 'models/' directory!")

if __name__ == "__main__":
    train_and_save_models()