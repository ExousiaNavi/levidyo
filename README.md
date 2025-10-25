# FastAPI Cloudflare Tunnel Setup

## Prerequisites
- Python 3.9 or higher  
- pip (Python package installer)  
- Cloudflared (Cloudflare Tunnel CLI)

## Setup and Installation
- Clone the repository and navigate into the folder:

## bash
- git clone https://github.com/bajidata/KYC.git
- cd KYC

# Create a virtual environment and activate it:
- python -m venv env

# Windows
- env\Scripts\activate

# macOS / Linux
- source env/bin/activate

# Install the dependencies:
- pip install -r backend/requirements.txt

Install Cloudflared for exposing your server:
# macOS
- brew install cloudflare/cloudflare/cloudflared

# Windows (Chocolatey)
- choco install cloudflared

# Ubuntu/Debian
- sudo apt install cloudflared

# Verify installation:
- cloudflared --version

# Running the Application
- Open two terminals with the virtual environment activated.

# In the first terminal, run the FastAPI server:
- uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# In the second terminal, start Cloudflare Tunnel:
- cloudflared tunnel --url http://localhost:8000

# Cloudflare will display a public URL such as:
- https://randomstring.trycloudflare.com
