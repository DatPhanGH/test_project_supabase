from flask import Flask, request, jsonify
import os
import requests
import base64
from ai_server.inference import run_inference
from ai_server.upload_drive import upload_to_drive
from ai_server.supabase_utils import save_predictions, update_image_status, create_image_record, supabase
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Cấu hình để xử lý response lớn
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Nếu bạn muốn upload ảnh vào 1 folder riêng trên Google Drive, thêm folder_id tại đây
FOLDER_ID = "161IeJj_ZJpw_whbLSn5amY57Scxs0aJt"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_KEY")  # Service role key để bypass RLS


def get_user_from_token(access_token: str):
    if not access_token:
        raise ValueError("Thiếu access token Supabase")

    if not SUPABASE_URL or not SUPABASE_API_KEY:
        raise RuntimeError("Chưa cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY/SUPABASE_KEY")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": SUPABASE_API_KEY,
    }

    response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers, timeout=10)

    if response.status_code != 200:
        raise PermissionError("Token Supabase không hợp lệ hoặc đã hết hạn")

    return response.json()


def image_to_base64(image_path):
    """Chuyển đổi ảnh thành base64 string."""
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            # Xác định loại ảnh từ extension
            ext = os.path.splitext(image_path)[1].lower()
            mime_type = f"image/{ext[1:]}" if ext else "image/jpeg"
            if ext == '.jpg' or ext == '.jpeg':
                mime_type = "image/jpeg"
            elif ext == '.png':
                mime_type = "image/png"
            elif ext == '.gif':
                mime_type = "image/gif"
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"❌ Lỗi khi chuyển đổi ảnh sang base64: {e}")
        return None


@app.route("/upload", methods=["POST"])
def upload_image():
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Thiếu token xác thực"}), 401

        access_token = auth_header.split(" ", 1)[1].strip()
        user_info = get_user_from_token(access_token)
        user_id = user_info.get("id")

        if not user_id:
            return jsonify({"error": "Không tìm thấy thông tin người dùng Supabase"}), 401

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "Chưa có file ảnh gửi lên!"}), 400

        # 📥 Lưu ảnh tạm vào thư mục uploads
        temp_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(temp_path)
        print(f"📂 Đã nhận ảnh: {temp_path}")

        # Lưu ảnh vào supabase với trạng thái uploaded
        image_id = create_image_record(user_id, temp_path)
        print(f"🆔 Tạo record ảnh (uploaded): ID = {image_id}")

        # cập nhật trạng thái của ảnh : processing
        update_image_status(image_id, "processing")

        # 🤖 Chạy nhận diện YOLO (model tự lấy từ Supabase)
        inference_result = run_inference(temp_path)
        predictions = inference_result.get("predictions", [])
        
        print(f"✅ Phân loại xong, phát hiện {len(predictions)} vật thể.")

        # ☁️ Upload ảnh gốc lên Google Drive (chỉ lưu ảnh gốc, không lưu ảnh có bounding box)
        file_url = upload_to_drive(temp_path, FOLDER_ID)
        print(f"☁️ Đã upload ảnh gốc lên Drive: {file_url}")

        # 💾 Lưu vào Supabase
        update_image_status(image_id, "done", file_url)
        if predictions:
            save_predictions(image_id, predictions)
            print("📦 Đã lưu dữ liệu vào Supabase!")
        else:
            print("⚠️ Không có predictions để lưu.")

        # 🧹 Xóa file tạm (sau khi đã upload lên Google Drive)
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception as e:
            print(f"⚠️ Không thể xóa file tạm: {e}")

        # Trả về kết quả (KHÔNG trả về ảnh base64 để giảm kích thước response)
        # Frontend sẽ load ảnh từ file_url và vẽ bounding box
        response_data = {
            "message": "Phân loại thành công 🎉" if predictions else "Không phát hiện vật thể nào",
            "image_id": image_id,  # Thêm image_id để frontend có thể lưu feedback
            "file_url": file_url,  # URL ảnh trên Google Drive
            "original_image_base64": None,  # Không trả về base64 để giảm kích thước response
            "predictions": predictions,
            "has_predictions": len(predictions) > 0
        }

        # Tạo response (không cần headers đặc biệt vì không còn base64)
        response = jsonify(response_data)
        
        print(f"📤 Đang trả về response: image_id={image_id}, predictions={len(predictions)}, file_url={file_url}")
        
        return response, 200

    except PermissionError as auth_error:
        print("❌ Lỗi xác thực Supabase:", str(auth_error))
        return jsonify({"error": str(auth_error)}), 401
    except Exception as e:
        print("❌ Lỗi:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/test", methods=["POST"])
def test_classify():
    """
    Endpoint test - chỉ chạy inference, KHÔNG lưu vào Supabase
    Dùng cho chức năng quét real-time
    """
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "Chưa có file ảnh gửi lên!"}), 400

        # 📥 Lưu ảnh tạm
        temp_path = os.path.join(UPLOAD_FOLDER, f"test_{file.filename}")
        file.save(temp_path)
        print(f"🧪 [TEST MODE] Đã nhận ảnh: {temp_path}")

        # 🤖 Chạy nhận diện YOLO (chỉ inference, không lưu)
        inference_result = run_inference(temp_path)
        predictions = inference_result.get("predictions", [])
        
        print(f"✅ [TEST MODE] Phân loại xong, phát hiện {len(predictions)} vật thể.")

        # 🧹 Xóa file tạm ngay sau khi inference
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception as e:
            print(f"⚠️ Không thể xóa file tạm: {e}")

        # Trả về kết quả (không có image_id, file_url vì không lưu)
        response_data = {
            "message": "Test phân loại thành công 🎉" if predictions else "Không phát hiện vật thể nào",
            "predictions": predictions,
            "has_predictions": len(predictions) > 0
        }

        response = jsonify(response_data)
        print(f"📤 [TEST MODE] Đang trả về response: predictions={len(predictions)}")
        
        return response, 200

    except Exception as e:
        print(f"❌ [TEST MODE] Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/statistics", methods=["GET"])
def get_statistics():
    """Lấy thống kê hệ thống từ Supabase (sử dụng service role key để bypass RLS)"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Thiếu token xác thực"}), 401

        access_token = auth_header.split(" ", 1)[1].strip()
        user_info = get_user_from_token(access_token)
        user_id = user_info.get("id")

        if not user_id:
            return jsonify({"error": "Không tìm thấy thông tin người dùng Supabase"}), 401

        # Sử dụng supabase client với service role key (đã có trong supabase_utils)
        # 1. Lượt phân loại của người dùng hiện tại (số images có status = 'done')
        user_images_res = supabase.table("images").select("image_id", count="exact").eq("user_id", user_id).eq("status", "done").execute()
        user_classifications = user_images_res.count if hasattr(user_images_res, 'count') and user_images_res.count is not None else (len(user_images_res.data) if user_images_res.data else 0)

        # 2. Độ chính xác trung bình của người dùng hiện tại
        # Lấy predictions thông qua images của user
        user_images_list = supabase.table("images").select("image_id").eq("user_id", user_id).execute()
        image_ids = [img["image_id"] for img in (user_images_list.data if user_images_list.data else [])]
        
        avg_confidence = 0
        if image_ids:
            user_predictions_res = supabase.table("predictions").select("confidence").in_("image_id", image_ids).execute()
            user_predictions = user_predictions_res.data if user_predictions_res.data else []
            if user_predictions:
                avg_confidence = sum(p.get("confidence", 0) for p in user_predictions) / len(user_predictions) * 100

        # 3. Tổng số người dùng (sử dụng service role key để bypass RLS)
        all_users_res = supabase.table("users").select("user_id", count="exact").execute()
        total_users = all_users_res.count if hasattr(all_users_res, 'count') and all_users_res.count is not None else (len(all_users_res.data) if all_users_res.data else 0)

        # 4. Tổng số predictions (sử dụng service role key để bypass RLS)
        all_predictions_res = supabase.table("predictions").select("prediction_id", count="exact").execute()
        total_predictions = all_predictions_res.count if hasattr(all_predictions_res, 'count') and all_predictions_res.count is not None else (len(all_predictions_res.data) if all_predictions_res.data else 0)

        return jsonify({
            "userClassifications": user_classifications,
            "avgConfidence": round(avg_confidence, 1),
            "totalUsers": total_users,
            "totalPredictions": total_predictions
        }), 200

    except PermissionError as auth_error:
        print("❌ Lỗi xác thực Supabase:", str(auth_error))
        return jsonify({"error": str(auth_error)}), 401
    except Exception as e:
        print("❌ Lỗi khi lấy thống kê:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # app.run(port=5000, debug=True)
    # host='0.0.0.0' cho phép kết nối từ bên ngoài (emulator, thiết bị thật)
    # Nếu chỉ dùng localhost, dùng host='127.0.0.1'
    app.run(host='0.0.0.0', port=5000, debug=True)
