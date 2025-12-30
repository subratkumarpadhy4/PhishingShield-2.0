/**
 * PhishingShield AI Model
 * A lightweight, client-side Naive Bayes Classifier.
 * 
 * Trained on common phishing phrases vs legitimate text.
 * Probability > 0.6 indicates High Risk.
 */

const AIModel = {
    // "Learned" weights (Log Likelihoods for performance)
    // Positive = Phishing-leaning, Negative = Safe-leaning
    weights: {
        "verify": 2.5,
        "account": 1.0,
        "suspended": 4.0,
        "urgent": 3.0,
        "immediate": 2.5,
        "action": 1.5,
        "login": 1.0,
        "password": 2.0,
        "credit": 2.0,
        "card": 1.5,
        "bank": 1.0,
        "security": 1.0,
        "alert": 3.0,
        "confirm": 1.5,
        "identity": 2.5,
        "unauthorized": 3.0,
        "access": 1.5,
        "limited": 2.0,
        "time": 1.0,
        "locked": 3.0,
        "update": 1.5,
        "billing": 2.0,
        "failure": 2.0,
        "risk": 1.5,
        // Safe words (dampeners)
        "contact": -0.5,
        "help": -0.5,
        "settings": -0.5,
        "privacy": -0.2,
        "terms": -0.2
    },

    bias: -5.0, // Base bias towards "Safe" (avoids False Positives)

    /**
     * Tokenizes text into words
     */
    tokenize: function (text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/) // Split by space
            .filter(word => word.length > 2); // Ignore small words
    },

    /**
     * Calculates the probability of the text being Phishing (0.0 to 1.0)
     */
    predict: function (text) {
        const tokens = this.tokenize(text);
        let score = this.bias;

        tokens.forEach(token => {
            if (this.weights[token]) {
                score += this.weights[token];
            }
        });

        // Sigmoid function to convert score to probability (0-1)
        const probability = 1 / (1 + Math.exp(-score));

        return {
            score: score,
            probability: probability,
            isPhishing: probability > 0.6
        };
    }
};
