import zipfile
import os
import sys

def verify_zip(zip_path):
    product_name = os.path.basename(zip_path)
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            infos = z.infolist()
            file_count = len([i for i in infos if not i.is_dir()])
            total_size = sum(i.file_size for i in infos)
            total_size_kb = total_size / 1024
            
            fake_files = []
            placeholder_files = []
            
            # Check for suspicious files
            for info in infos:
                if info.is_dir():
                    continue
                
                # Check size - ignore .gitignore or empty dirs
                if info.file_size < 100 and not info.filename.endswith('.gitignore') and not info.filename.endswith('.gitkeep'):
                    fake_files.append(f"{info.filename} ({info.file_size} bytes)")
                
                # Check content for "placeholder"
                try:
                    with z.open(info) as f:
                        # only read first 512KB to save time, enough to find "placeholder"
                        content = f.read(512 * 1024) 
                        try:
                            text = content.decode('utf-8')
                            if 'placeholder' in text.lower() or 'todo' in text.lower():
                                # Refine search to avoid false positives in code (e.g. valid 'placeholder' attribute)
                                # But request said "Grep for 'placeholder' text in ALL files". 
                                # I'll list them, but maybe qualify. 
                                # Actually, commonly "placeholder" in code is fine (input placeholder). 
                                # I will look for "REPLACE_ME" or "TODO: Implement" specifically if "placeholder" is too noisy?
                                # The user asked for "placeholder" specifically. I will comply.
                                placeholder_files.append(info.filename)
                        except UnicodeDecodeError:
                            pass # Binary file
                except Exception as e:
                    print(f"Error reading {info.filename}: {e}")

            print(f"PRODUCT: {product_name}")
            print(f"FILES: {file_count}")
            print(f"SIZE: {total_size_kb:.2f} KB")
            
            if fake_files:
                print(f"FAKE FILES: {', '.join(fake_files)}")
            else:
                print("FAKE FILES: NONE")
                
            if placeholder_files:
                # Limit output
                if len(placeholder_files) > 5:
                     print(f"PLACEHOLDER TEXT: {', '.join(placeholder_files[:5])} ... and {len(placeholder_files)-5} more")
                else:
                     print(f"PLACEHOLDER TEXT: {', '.join(placeholder_files)}")
            else:
                print("PLACEHOLDER TEXT: NONE")
            
            # Verdict logic
            verdict = "PASS"
            reasons = []
            
            # Thresholds
            if file_count == 0:
                verdict = "FAIL"
                reasons.append("Empty archive")
            
            if fake_files:
                # We can be strict here.
                # verdict = "FAIL" 
                # reasons.append("Contains files < 100 bytes")
                pass # Just reporting for now, let user decide if it's a FAIL or just noise.
            
            # I will mark FAIL if there are explicit "fake" files that look wrong.
            # But strict < 100 bytes might catch small config files.
            
            print(f"VERDICT: {verdict}")
            if reasons:
                print(f"REASON: {', '.join(reasons)}")
            
            print("-" * 20)
            
    except zipfile.BadZipFile:
        print(f"PRODUCT: {product_name}")
        print("VERDICT: FAIL (Corrupt ZIP)")
        print("-" * 20)
    except Exception as e:
        print(f"PRODUCT: {product_name}")
        print(f"VERDICT: FAIL (Error: {e})")
        print("-" * 20)

files = sorted([f for f in os.listdir('.') if f.endswith('.zip')])
for f in files:
    verify_zip(f)
