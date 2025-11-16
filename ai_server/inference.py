from ultralytics import YOLO
from ai_server.model_manager import get_active_model_path,get_active_model_info
from ai_server.supabase_utils import supabase

# Nếu YOLO trả nhãn tiếng Anh mà DB lưu tiếng Việt, bạn có thể map như sau:
LABEL_TO_CATEGORY = {
    "plastic": "Nhựa",
    "paper": "Giấy",
    "metal": "Kim loại",
    "glass": "Thủy tinh",
    "organic": "Hữu cơ"
}

def get_category_info_by_name(label_name: str):
    """Truy vấn category_id và category_name từ bảng waste_categories theo tên nhãn."""
    label_name = LABEL_TO_CATEGORY.get(label_name, label_name.lower())
    res = supabase.table("waste_categories").select("category_id, name").eq("name", label_name).execute()
    if res.data:
        return {
            "category_id": res.data[0]["category_id"],
            "category_name": res.data[0]["name"]
        }
    else:
        print(f"⚠️ Không tìm thấy danh mục '{label_name}' trong bảng waste_categories.")
        return None

def run_inference(image_path):
    """
    Chạy YOLO và trả về danh sách predictions đã định dạng để lưu Supabase.
    Không tạo ảnh có bounding box - chỉ trả về tọa độ để frontend vẽ.
    
    Args:
        image_path: Đường dẫn đến ảnh cần nhận diện
    
    Returns:
        dict: {
            "predictions": list of predictions với bbox coordinates
        }
    """
    model_info = get_active_model_info()
    model_path = get_active_model_path()
    model_id = model_info["model_id"]

    print(f"✅ Đang dùng mô hình: {model_info['name']} (v{model_info['version']})")
    print(f"📂 Trọng số: {model_path}")

    model = YOLO(model_path)
    results = model.predict(
        image_path,
        conf=0.3,
        augment=True,save=True
    )

    predictions = []
    
    # Lấy predictions với tọa độ bounding box
    if results and len(results) > 0:
        for r in results:
            for box in r.boxes:
                label_name = model.names[int(box.cls[0])]
                category_info = get_category_info_by_name(label_name)
                if category_info is None:
                    continue
                
                # Lấy tọa độ bounding box [x1, y1, x2, y2]
                bbox = box.xyxy[0].tolist()
                
                predictions.append({
                    "category_id": category_info["category_id"],
                    "category_name": category_info["category_name"],
                    "model_id": model_id,
                    "confidence": float(box.conf[0]),
                    "bbox": bbox  # [x1, y1, x2, y2] - tọa độ để vẽ trên frontend
                })
    
    print(f"✅ Phát hiện {len(predictions)} vật thể hợp lệ để lưu.")
    
    return {
        "predictions": predictions
    }
