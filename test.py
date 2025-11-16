import os
import pandas as pd

# 🔧 Đổi đường dẫn này thành thư mục thật chứa các mô hình YOLO (mỗi mô hình có results.csv)
models_base_path = r"D:\doantotnghiep\2_project_supabase\weights"  

def summarize_yolo_results(result_csv_path):
    """Tính Precision, Recall, F1, Accuracy (từ mAP50) của 1 mô hình YOLO"""
    df = pd.read_csv(result_csv_path)
    precision = df["metrics/precision(B)"].max()
    recall = df["metrics/recall(B)"].max()
    map50 = df["metrics/mAP50(B)"].max()  # tạm xem như accuracy
    f1 = 2 * (precision * recall) / (precision + recall)
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "accuracy(mAP50)": round(map50, 4)
    }

# 📊 Lặp qua tất cả các mô hình
results_summary = []
for model_name in os.listdir(models_base_path):
    result_path = os.path.join(models_base_path, model_name, "results.csv")
    if os.path.exists(result_path):
        metrics = summarize_yolo_results(result_path)
        metrics["model_name"] = model_name
        results_summary.append(metrics)

# ✅ Xuất ra bảng tổng hợp
results_df = pd.DataFrame(results_summary)
print("\n📊 Bảng tổng hợp chỉ số đánh giá mô hình YOLO:")
print(results_df)

# Lưu ra file CSV nếu muốn
results_df.to_csv("summary_yolo_metrics.csv", index=False)
