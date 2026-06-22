import re
import string
import nltk
from nltk.corpus import stopwords

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

_STOP_WORDS = set(stopwords.words('english'))
_PUNCT_TABLE = str.maketrans('', '', string.punctuation)

def clean_text_list(texts):
    """
    Cleans a list of text strings by removing punctuation, numbers,
    stopwords, and lowercasing the text.
    """
    cleaned = []
    
    for text in texts:
        # Handle cases where text might be None or NaN
        if not isinstance(text, str):
            text = ""
            
        text = text.translate(_PUNCT_TABLE)
        text = re.sub(r'\d+', '', text)
        text = text.lower()
        text = ' '.join(w for w in text.split() if w not in _STOP_WORDS)
        text = re.sub(r'[^a-z\s]', '', text)
        text = ' '.join(text.split())
        
        cleaned.append(text)
        
    return cleaned