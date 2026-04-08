import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# Download VADER lexicon quietly for sentiment analysis
try:
    nltk.data.find('sentiment/vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

# Initialize the Sentiment Analyzer
sia = SentimentIntensityAnalyzer()

def analysis_sentiment(text):
    """
    Analyzes the sentiment of the original text using NLTK's VADER.
    Returns 'positive', 'neutral', or 'negative'.
    """
    # Calculate polarity scores
    scores = sia.polarity_scores(text)
    compound = scores['compound']
    
    # Classify based on the compound score
    if compound >= 0.05:
        return 'positive'
    elif compound <= -0.05:
        return 'negative'
    else:
        return 'neutral'