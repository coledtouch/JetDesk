head = open('app_head.html').read()
js = open('app.js').read()
data = open('airports_us.json').read()
# JSON inside a script tag: escape any '</script' sequences (none expected, but be safe)
data = data.replace('</', '<\\/')
js_safe = js.replace('</script', '<\\/script')

page = (head
        + '\n<script id="apdata" type="application/json">' + data + '</script>\n'
        + '<script>\n' + js_safe + '\n</script>\n')
open('dale_app.html', 'w').write(page)
print('bytes:', len(page))
