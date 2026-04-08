import re
import string
import nltk
from nltk.corpus import stopwords

# Ensure stopwords are downloaded silently
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

def clean_text_list(texts):
    """
    Cleans a list of text strings by removing punctuation, numbers, 
    stopwords, and lowercasing the text.
    """
    stop_words = set(stopwords.words('english'))
    cleaned = []
    
    for text in texts:
        # Handle cases where text might be None or NaN
        if not isinstance(text, str):
            text = ""
            
        # Remove punctuation
        text = text.translate(str.maketrans('', '', string.punctuation))
        # Remove digits
        text = re.sub(r'\d+', '', text)
        # Convert to lowercase
        text = text.lower()
        # Remove stopwords
        text = ' '.join([w for w in text.split() if w not in stop_words])
        # Remove non-alphabetical characters
        text = re.sub(r'[^a-z\s]', '', text)
        # Remove multiple spaces
        text = ' '.join(text.split())
        
        cleaned.append(text)
        
    return cleaned