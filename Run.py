import os
import shutil

SOURCE_DIR = "C:\\Users\\PZWind-AkashM\\Desktop\\BigData\\DATA"          # your 5GB folder
TARGET_DIR = "C:\\Users\\PZWind-AkashM\\Desktop\\BigData\\DATA_100GB"    # new 100GB folder
COPIES = 20                     # 5GB × 20 = 100GB

os.makedirs(TARGET_DIR, exist_ok=True)

for i in range(COPIES):
    for root, dirs, files in os.walk(SOURCE_DIR):
        rel_path = os.path.relpath(root, SOURCE_DIR)
        dest_path = os.path.join(TARGET_DIR, rel_path)
        os.makedirs(dest_path, exist_ok=True)

        for file in files:
            name, ext = os.path.splitext(file)

            # Add copy number to filename
            new_filename = f"{name}_copy{i}{ext}"

            src_file = os.path.join(root, file)
            dst_file = os.path.join(dest_path, new_filename)

            shutil.copy(src_file, dst_file)

print("✅ 100GB dataset created with unique filenames.")
