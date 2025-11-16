import os
from supabase import create_client
from ultralytics import YOLO
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_active_model_info():
    """Trả về thông tin mô hình đang được kích hoạt (is_active=True)."""
    res = supabase.table("ai_models").select("*").eq("is_active", True).limit(1).execute()
    if not res.data:
        raise Exception("❌ Không có mô hình nào đang kích hoạt.")
    return res.data[0]

def get_active_model_path():
    """Trả về đường dẫn file trọng số (best.pt) của mô hình active."""
    info = get_active_model_info()
    model_path = os.path.abspath(os.path.join("ai_server", info["file_path"]))
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"❌ Không tìm thấy file trọng số tại: {model_path}")
    return model_path
