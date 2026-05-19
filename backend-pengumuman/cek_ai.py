from google import genai
from dotenv import load_dotenv
import os
import os
from google import genai
from google.genai import types

# Load API Key dari .env
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
user_prompt = "Apa jadwal pelajaran untuk kelas 5B pada hari Kamis?"
client = genai.Client(api_key=GEMINI_API_KEY)
instruksi_ai = "Kamu adalah asisten yang membantu menjawab pertanyaan terkait jadwal pelajaran di sekolah. Jawab dengan singkat dan jelas berdasarkan data yang diberikan."

# Menarik daftar semua model yang aktif
try:
    print("Mengirim request ke Google GenAI (Gemini 1.5 Flash)...")

    # Inisialisasi Model dengan System Prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=instruksi_ai,
            temperature=0.1,
        ),
    )
    print("Response dari Google GenAI:")
    print(response.text)
except Exception as e:
    print(f"Error saat mengambil daftar model: {e}")
