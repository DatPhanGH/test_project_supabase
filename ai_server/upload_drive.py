from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import os, pickle, json

# Ứng dụng này chỉ có quyền truy cập các file mà chính nó tạo hoặc tải lên.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
cred_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
token_path = os.getenv("GOOGLE_TOKEN_PATH","token.json")
flow = InstalledAppFlow.from_client_secrets_file(cred_path, SCOPES)

# 🔹 Chuyển thành đường dẫn tuyệt đối để tránh lỗi khi chạy Flask từ gốc dự án
cred_path = os.path.abspath(cred_path)
token_path = os.path.abspath(token_path)

def get_drive_service():
    creds = None

    # ✅ Kiểm tra token tồn tại ở đúng đường dẫn cấu hình
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    # 🔄 Nếu chưa có token hoặc token hết hạn → yêu cầu đăng nhập lại
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print("⚠️ Đang xác thực Google Drive API...")
            flow = InstalledAppFlow.from_client_secrets_file(cred_path, SCOPES)
            creds = flow.run_local_server(port=0)

        # 💾 Lưu lại token mới để lần sau không cần xác thực nữa
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    print(f"✅ Đã sẵn sàng kết nối Google Drive.\n📂 Token: {token_path}")
    return build("drive", "v3", credentials=creds)

def upload_to_drive(file_path, folder_id=None):
    service = get_drive_service()

    file_metadata = {'name': os.path.basename(file_path)}
    if folder_id:
        file_metadata['parents'] = [folder_id]

    media = MediaFileUpload(file_path, mimetype='image/jpeg')
    file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()

    # Cấp quyền xem công khai
    service.permissions().create(fileId=file['id'], body={'type': 'anyone', 'role': 'reader'}).execute()

    drive_link = f"https://drive.google.com/uc?export=view&id={file['id']}"
    print(f"☁️ Đã upload lên Google Drive: {drive_link}")
    return drive_link