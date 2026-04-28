class Card {
    constructor(suit, rank, value) {
        this.suit = suit;
        this.rank = rank;
        this.value = value;
    }

    get isRed() {
        return this.suit === '♥' || this.suit === '♦';
    }

    getDomElement(isHidden = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${this.isRed ? 'red' : 'black'}`;
        
        if (isHidden) {
            cardDiv.classList.add('hidden-card');
        } else {
            cardDiv.innerHTML = `
                <div class="top-left"><span>${this.rank}</span><span class="suit">${this.suit}</span></div>
                <div class="center-suit">${this.suit}</div>
                <div class="bottom-right"><span>${this.rank}</span><span class="suit">${this.suit}</span></div>
            `;
        }
        return cardDiv;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

        for (let i = 0; i < suits.length; i++) {
            for (let j = 0; j < ranks.length; j++) {
                this.cards.push(new Card(suits[i], ranks[j], values[j]));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.reset();
            this.shuffle();
        }
        return this.cards.pop();
    }

    clone() {
        const newDeck = new Deck();
        newDeck.cards = this.cards.map(c => new Card(c.suit, c.rank, c.value));
        return newDeck;
    }
}
