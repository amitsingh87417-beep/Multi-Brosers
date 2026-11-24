# Multi-Platform Media & Link Wall (GitHub Ready Starter)

Yeh ek separate starter template hai jisse aap **Website**, **YouTube**, **Instagram**, **Facebook**, aur **Other** platform links/videos ko filter, search, aur `Load More` pagination ke saath organize kar sakte hain.

## Kaise Use Karein
1. `index.html`, `styles.css`, `app.js`, aur `items.json` ko ek naye GitHub repository mein upload karein.
2. `items.json` mein apne real links (`Website`, `YouTube`, `Instagram`, `Facebook`, `Other`) add karein (chahein to is pattern mein 100 ya 1000 items rakh sakte hain).
3. GitHub Pages, Vercel, ya kisi static host par publish karein.

## Important Technical Notes
- **Performance:** Ek saath 1000 live tabs/iframes chalane ke bajay yeh wall `24` items per page (`Load More` ke saath) render karti hai taaki mobile/laptop browser hang na ho.
- **Platform Embed Rules:** YouTube inline player open hota hai jab video embedding allowed ho; Instagram, Facebook, aur kai websites embed/iframe block karte hain, isliye unke liye safe new-tab link fallback diya gaya hai.
