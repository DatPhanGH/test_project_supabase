from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

# ==========================================================
# 1️⃣ TẠO BẢN GHI ẢNH BAN ĐẦU
# ==========================================================
def create_image_record(user_id, local_path):
    """Tạo bản ghi ảnh với trạng thái ban đầu là 'uploaded'."""
    res = supabase.table("images").insert({
        "user_id": user_id,
        "file_path": local_path,
        "status": "uploaded"
    }).execute()
    if not res.data:
        raise Exception("❌ Không thể tạo record ảnh trong Supabase.")
    return res.data[0]["image_id"]

# ==========================================================
# 2️⃣ CẬP NHẬT TRẠNG THÁI ẢNH
# ==========================================================
def update_image_status(image_id, status, new_path=None):
    """Cập nhật trạng thái ảnh trong bảng images."""
    data = {"status": status}
    if new_path:
        data["file_path"] = new_path
    supabase.table("images").update(data).eq("image_id", image_id).execute()
    print(f"🔄 Cập nhật ảnh {image_id}: {status}")

# ==========================================================
# 3️⃣ LƯU PREDICTIONS
# ==========================================================
def save_predictions(image_id, predictions):
    """Lưu danh sách dự đoán vào bảng predictions."""
    if not predictions or not isinstance(predictions, list):
        print("⚠️ Không có dự đoán nào để lưu.")
        return

    for idx, p in enumerate(predictions, start=1):
        try:
            category_id = p.get("category_id")
            model_id = p.get("model_id")
            bbox = p.get("bbox", [0, 0, 0, 0])
            confidence = p.get("confidence", 0.0)

            if category_id is None or model_id is None:
                print(f"⚠️ Dự đoán {idx}: thiếu category_id hoặc model_id, bỏ qua.")
                continue

            data = {
                "image_id": image_id,
                "category_id": category_id,
                "model_id": model_id,
                "confidence": confidence,
                "bbox_x1": bbox[0],
                "bbox_y1": bbox[1],
                "bbox_x2": bbox[2],
                "bbox_y2": bbox[3]
            }

            res_pred = supabase.table("predictions").insert(data).execute()
            print(f"✅ Prediction {idx} saved:", res_pred.data)

        except Exception as e:
            print(f"❌ Lỗi khi lưu prediction {idx}: {e}")
            
# def save_image_record(user_id, file_url, predictions):
#     """Lưu thông tin ảnh và các dự đoán tương ứng vào Supabase."""
#     # 🧩 Lưu ảnh
#     res_img = supabase.table("images").insert({
#         "user_id": user_id,
#         "file_path": file_url,
#         "status": "done"
#     }).execute()
#     print("📸 Saved image:", res_img.data)

#     if not res_img.data:
#         raise Exception("❌ Không thể lưu ảnh vào bảng images")

#     image_id = res_img.data[0]["image_id"]
#     print(f"🆔 Image ID được tạo: {image_id}")

#     # 🧩 Nếu không có predictions, return sớm
#     if not predictions or not isinstance(predictions, list):
#         print("⚠️ Không có dự đoán nào để lưu.")
#         return

#     # 🧩 Lưu từng prediction
#     for idx, p in enumerate(predictions, start=1):
#         try:
#             category_id = p.get("category_id")
#             model_id = p.get("model_id")
#             bbox = p.get("bbox", [0, 0, 0, 0])
#             confidence = p.get("confidence", 0.0)

#             if category_id is None or model_id is None:
#                 print(f"⚠️ Dòng {idx}: thiếu category_id hoặc model_id, bỏ qua.")
#                 continue

#             data = {
#                 "image_id": image_id,
#                 "category_id": category_id,
#                 "model_id": model_id,
#                 "confidence": confidence,
#                 "bbox_x1": bbox[0],
#                 "bbox_y1": bbox[1],
#                 "bbox_x2": bbox[2],
#                 "bbox_y2": bbox[3]
#             }

#             res_pred = supabase.table("predictions").insert(data).execute()
#             print(f"✅ Prediction {idx} saved:", res_pred.data)

#         except Exception as e:
#             print(f"❌ Lỗi khi lưu prediction {idx}: {e}")
