# Automated play-through of every level (needs: pip install playwright; python3 -m http.server 8765 in the repo root).
# Usage: python3 tools/playtest.py [screenshot_dir] [base_url]. SOL holds a valid solution for every guided task and challenge.
import asyncio,sys,json
from playwright.async_api import async_playwright
sp=sys.argv[1] if len(sys.argv)>1 else '.'
BASE=sys.argv[2] if len(sys.argv)>2 else 'http://localhost:8765/'
SOL={
 '0-1':{'g':[[('V',6)],[('view','elec')],[('b',1)],[('value',0.0047)]],'c':25},
 '0-2':{'g':[[('S1','on',True)],[('S1','on',False)],[('S1','on',True),('S2','on',True)],[('S1','on',False),('S1','on',True)]],'c':[('S1','on',True),('S3','on',True),('S2','on',False)]},
 '0-3':{'g':[[('B1','v',10),('R1','r',1000)],[('R1','r',2000)],[('R1','r',5000)]],'c':[('R1','r',4000)]},
 '0-4':{'g':[[('B1','v',6)],[('B1','v',12)],['wait6']],'c':4},
 '0-5':{'g':[[('R2','r',3000),('R2','r',5000),('R2','r',6000)],[('R2','r',2000)],[('R2','r',4000)],[('R1','r',3000),('R1','r',2500)]],'c':5},
 '0-6':{'g':[[('R2','r',10000)],[('R1','r',30000),('R2','r',10000)],[('P1','pos',0.75)]],'c':[('R2','r',5000)]},
}
async def apply(pg,ops):
    for op in ops:
        if op=='wait6': await pg.wait_for_timeout(6000); continue
        if len(op)==2: await pg.evaluate(f"CR.widget().set({json.dumps(op[0])},{json.dumps(op[1])})")
        else: await pg.evaluate(f"CR.widget().set({json.dumps(op[0])},{json.dumps(op[1])},{json.dumps(op[2])})")
        await pg.wait_for_timeout(80)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1300,'height':800})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(BASE);await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(500)
        for lv,sol in SOL.items():
            await pg.click('.lv.open');await pg.wait_for_timeout(300)
            # demo
            while True:
                btns=await pg.locator('.panel-foot .btn.pri').all_text_contents()
                await pg.click('.panel-foot .btn.pri');await pg.wait_for_timeout(150)
                if 'לתרגול' in btns[0]: break
            for i,ops in enumerate(sol['g']):
                await apply(pg,ops);await pg.wait_for_timeout(450)
                dis=await pg.locator('.panel-foot .btn.pri').get_attribute('disabled')
                if dis is not None: print('FAIL guided',lv,i); await pg.screenshot(path=f'{sp}/fail_{lv}_{i}.png'); break
                await pg.click('.panel-foot .btn.pri');await pg.wait_for_timeout(250)
            c=sol['c']
            if isinstance(c,(int,float)): await pg.fill('.num',str(c))
            else: await apply(pg,c)
            await pg.click('.panel-foot .btn.pri');await pg.wait_for_timeout(250)
            ok=await pg.locator('.fb.ok').count()
            if not ok: print('FAIL challenge',lv); await pg.screenshot(path=f'{sp}/failc_{lv}.png'); continue
            await pg.click('.panel-foot .btn.pri');await pg.wait_for_timeout(250)
            quiz=await pg.evaluate(f"CR.LEVELS.find(l=>l.id=='{lv}').quiz.map(q=>q.a)")
            for a in quiz:
                await pg.locator('.opt').nth(a).click();await pg.wait_for_timeout(80)
                await pg.click('.panel-foot .btn.pri');await pg.wait_for_timeout(120)
            sc=await pg.text_content('.score')
            done=await pg.evaluate(f"!!CR.P.done['{lv}']")
            print(lv,'score',sc,'done',done)
            if lv=='0-6': await pg.screenshot(path=f'{sp}/final.png')
            await pg.evaluate("CR.showMap()");await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'{sp}/map_after.png')
        print('errors',errs);await b.close()
asyncio.run(main())
