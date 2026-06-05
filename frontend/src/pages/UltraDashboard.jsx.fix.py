import sys

file_path = r"c:\Users\LENOVO\Desktop\AI_loading\frontend\src\pages\UltraDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the start of the bad function
start_idx = -1
for i, line in enumerate(lines):
    if "const renderAgentComponent = (m) => {" in line:
        start_idx = i
        break

if start_idx == -1:
    print("Could not find start")
    sys.exit(1)

# Find the end of the bad function
end_idx = -1
for i in range(start_idx, len(lines)):
    if "return null;" in lines[i] and "};" in lines[i+1]:
        end_idx = i + 1
        break

if end_idx == -1:
    print("Could not find end")
    sys.exit(1)

# Extract the function
extracted_func = lines[start_idx : end_idx + 1]

# Find the line "const renderWarRoom = () => {" which shouldn't be there
bad_render_idx = -1
for i in range(end_idx, min(end_idx+10, len(lines))):
    if "const renderWarRoom = () => {" in lines[i]:
        bad_render_idx = i
        break

# Now delete the function block and bad_render from its current place
# and replace with {renderAgentComponent(m)}
new_lines = lines[:start_idx] + ["                    {renderAgentComponent(m)}\n"] 

if bad_render_idx != -1:
    new_lines += lines[end_idx+1 : bad_render_idx] + lines[bad_render_idx+1 :]
else:
    new_lines += lines[end_idx+1 :]

# Now find the main return to insert the extracted function before it
main_return_idx = -1
for i, line in enumerate(new_lines):
    if "return (" in line and "ultra-dashboard-scrollable" in new_lines[i+1]:
        main_return_idx = i
        break

if main_return_idx == -1:
    print("Could not find main return")
    # let's look for handleCloseVoiceMode
    for i, line in enumerate(new_lines):
        if "const handleCloseVoiceMode =" in line:
            main_return_idx = i
            break

if main_return_idx == -1:
    print("Could not find place to insert")
    sys.exit(1)

# Insert the extracted function
final_lines = new_lines[:main_return_idx] + extracted_func + ["\n"] + new_lines[main_return_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print("Fixed successfully.")
