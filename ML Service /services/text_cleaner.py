import re
import string
import nltk
from nltk.corpus import stopwords
nltk.download('stopwords')
def clean_text_list(texts):
    stop_words = set(stopwords.words('english'))
    cleaned = []
    for text in texts:
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = re.sub(r'\d+', '', text)
        text = text.lower()
        text = ' '.join([w for w in text.split() if w not in stop_words])
        text = re.sub(r'[^a-z\s]', '', text)
        text = ' '.join(text.split())
        cleaned.append(text)
    return cleaned