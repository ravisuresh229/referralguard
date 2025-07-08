# ReferralGuard

ReferralGuard is an AI-powered healthcare analytics platform that helps hospital systems prevent revenue loss from referral leakage. By analyzing real-time referral patterns and predicting potential out-of-network referrals, ReferralGuard enables healthcare organizations to retain valuable patient referrals and maximize revenue.

## Key Features

- Real-time referral flow visualization
- AI-powered leakage detection
- Predictive risk scoring
- Financial impact analysis
- Intervention workflow automation
- Executive dashboard with actionable insights

## Technical Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js with Tailwind CSS
- **Database**: PostgreSQL
- **ML**: Scikit-learn/XGBoost
- **Real-time**: WebSockets

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:
```bash
uvicorn app.main:app --reload
```

## Data Sources

- NPPES Provider Database
- Physician Compare National File
- Medicare Physician Services Data

## License

Proprietary - All rights reserved 