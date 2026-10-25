# FastAPI Entry Point
from fastapi import FastAPI

app = FastAPI()

@app.get('/')

def root():
    return {'message': 'LetLearnTogether API is running'}