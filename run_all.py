import subprocess
import time

BATCH = "5"  # mỗi lượt, cập nhật tối đa 5 ảnh

def run_step(cmd: list[str]):
	print(f"\n==> Running: {' '.join(cmd)}")
	proc = subprocess.run(cmd)
	if proc.returncode != 0:
		print(f"Command failed with exit code {proc.returncode}: {' '.join(cmd)}")
	return proc.returncode

while True:
	# 1) CASE: cập nhật 5 ảnh
	code = run_step(["python", "scripts/amazon_image_to_csv_case.py", BATCH])
	# 2) PSU: cập nhật 5 ảnh
	code2 = run_step(["python", "scripts/amazon_image_to_csv_psu.py", BATCH])
	# 3) HDD/SSD internal-hard-drive: cập nhật 5 ảnh
	code3 = run_step(["python", "scripts/amazon_image_to_csv.py", BATCH])

	# nghỉ ngắn giữa các vòng để tránh bị chặn
	time.sleep(5)