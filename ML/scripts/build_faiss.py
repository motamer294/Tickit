import pandas as pd
import faiss
import pickle
import os
from sentence_transformers import SentenceTransformer

def build_vector_database():
    dataset_file = 'dataset/Synthetic_ITSM_Data_Ready.csv'
    
    print(f" Loading dataset from {dataset_file}...")
    df = pd.read_csv(dataset_file)
    
    # تنظيف سريع تحسباً لأي خانات فاضية
    df['Description'] = df['Description'].fillna('')
    df['Resolution'] = df['Resolution'].fillna('')
    
    # تحويل الداتا لقاموس عشان نحفظها مع الـ Vectors
    faqs = df.to_dict('records')
    
    # دمج المشكلة مع الحل عشان الموديل يفهم السياق كامل
    texts = [f"Issue: {ticket['Description']} | Fix: {ticket['Resolution']}" for ticket in faqs]
    
    print(" Loading Sentence Transformer model (all-MiniLM-L6-v2)...")
    # الموديل ده خفيف جداً وممتاز في الـ Semantic Search
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    print(f" Generating embeddings for {len(texts)} tickets (This will take a minute or two)...")
    embeddings = embedding_model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    
    # تجهيز FAISS
    dimension = embeddings.shape[1] # غالباً هيكون 384
    print(f" Building FAISS index with dimension: {dimension}...")
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    # إنشاء فولدر models لو مش موجود
    os.makedirs('models', exist_ok=True)
    
    print(" Saving the brain to disk...")
    # حفظ الـ FAISS Index (المحرك السريع)
    with open('models/faiss_index.pkl', 'wb') as f:
        pickle.dump(index, f)
    
    # حفظ الـ Embeddings (الأرقام)
    with open('models/faq_embeddings.pkl', 'wb') as f:
        pickle.dump(embeddings, f)
    
    # حفظ الداتا الأصلية (عشان نقرأ منها النص لما نلاقي تطابق)
    with open('models/faq_data.pkl', 'wb') as f:
        pickle.dump(faqs, f)
        
    print(" Success! FAISS Database built and saved in 'models' directory.")

if __name__ == "__main__":
    build_vector_database()