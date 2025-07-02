from dotenv import dotenv_values

class Settings:
    def __init__(self):
        env = dotenv_values(".env")
        self.APP_NAME = env.get("APP_NAME", "Notification App")
        self.DEBUG = env.get("DEBUG", "True") == "True"

settings = Settings()
