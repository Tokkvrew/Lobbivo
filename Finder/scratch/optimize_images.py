import os
from PIL import Image

games_dir = r"c:\Users\User\Desktop\Finder\assets\images\games"

print("--- Optimizing Game Posters for Instant Mobile & Desktop Loading ---")
files = [f for f in os.listdir(games_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

total_orig_size = 0
total_new_size = 0

for f in files:
    file_path = os.path.join(games_dir, f)
    orig_size = os.path.getsize(file_path)
    total_orig_size += orig_size
    
    with Image.open(file_path) as img:
        img = img.convert('RGB')
        
        # Target size for crisp card display (width 480px max)
        w, h = img.size
        max_w = 480
        if w > max_w:
            new_h = int(h * (max_w / w))
            img = img.resize((max_w, new_h), Image.Resampling.LANCZOS)
            
        # Save optimized progressive JPEG
        img.save(file_path, 'JPEG', quality=84, optimize=True, progressive=True)
        
    new_size = os.path.getsize(file_path)
    total_new_size += new_size
    print(f" {f}: {orig_size // 1024} KB -> {new_size // 1024} KB (-{round((1 - new_size/orig_size)*100)}%)")

print(f"\nTotal Size: {total_orig_size // 1024} KB -> {total_new_size // 1024} KB (-{round((1 - total_new_size/total_orig_size)*100)}%)")
print(" [SUCCESS] All images optimized for instant 0ms rendering!")
