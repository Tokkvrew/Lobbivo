import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('js/telegram-bot.js', 'r', encoding='utf-8') as f:
    s = f.read()

in_str = False
str_char = None
in_comment = False
in_multiline = False
escaped = False

stack = []
for i, ch in enumerate(s):
    if in_comment:
        if ch == '\n':
            in_comment = False
        continue
    if in_multiline:
        if ch == '/' and i > 0 and s[i-1] == '*':
            in_multiline = False
        continue
    if in_str:
        if escaped:
            escaped = False
        elif ch == '\\':
            escaped = True
        elif ch == str_char:
            in_str = False
        continue
    if ch == '/' and i+1 < len(s) and s[i+1] == '/':
        in_comment = True
        continue
    if ch == '/' and i+1 < len(s) and s[i+1] == '*':
        in_multiline = True
        continue
    if ch in ('"', "'", '`'):
        in_str = True
        str_char = ch
        continue
    if ch in '({[':
        stack.append((ch, i))
    elif ch in ')}]':
        if not stack:
            print('Unmatched close:', ch, 'at', i)
            break
        top, top_i = stack.pop()
        if (top == '(' and ch != ')') or (top == '{' and ch != '}') or (top == '[' and ch != ']'):
            print(f'Mismatch: expected match for {top} at {top_i}, got {ch} at {i}')
            break
else:
    if stack:
        print('Unclosed open tokens:', stack)
    else:
        print('PERFECT SYNTAX: All brackets/braces/parentheses balanced!')
