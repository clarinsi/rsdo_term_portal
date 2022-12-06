# Razvojne konvencije Terminološkega portala

_Tale dokument se bo dopolnjeval in ga v končnem repozitoriju ne bo ali pa bo v končni obliki v angleščini._

## Priporočen editor, nastavitve in razširitve

- Visual Studio Code ima za razvoj Node.js aplikacij ogromno uporabnih funkcionalnosti že vgrajenih

- Nastavitve in razširitve niso vključene v Git repozitorij, vendar jih Luka z veseljem priporoči/deli. Še posebej je uporabna launch konfiguracija za debugiranje kode v kontejnerju v realnem času.

- V VS Codu se da ta dokument brati v formatirani obliki z zagonom (_Ctrl + Shift + P_) ukaza `Markdown: Open Preview`

## Git workflow

- Commit messagi naj spoštujejo [to konvencijo](https://chris.beams.io/posts/git-commit/#seven-rules) in naj bodo v angleščini.

- Za začetek ne commitajmo direktno v _master_ vejo. Vsakršno delo naj bo opravljeno na ločeni veji, ki pa jo bo Luka po potrebi dopolnil/prilagodil in dodal v _master_. Tipičen tok naj torej sledi naslednjemu vzorcu:
  - Posodobiš _master_ na najnovejšo verzijo: `git pull origin master`
  - Narediš novo vejo za dopolnitve: `git checkout -b <ime veje>`
    - Ime veje naj bo formata _\<ime>/\<dopolnitev>_
    - Primer imena veje: _jure/admin-console_
  - Narediš potrebne popravke v kodi in jih poljubnokrat, toda vsaj enkrat, commitaš: `git commit -m "<Commit message>"`
  - Vejo porineš na remote repositorij: `git push origin <ime veje>`
  - Luku sporočiš, da je veja končana in pripravljena za integracijo v _master_
  - Ko Luka sporoči, da je bila veja integrirana, jo izbrišeš lokalno in na remote repozitoriju
    - Greš na _master_: `git checkout master`
    - Lokalni izbris: `git branch -D <ime veje>`
    - Remote izbris: `git push origin --delete <ime veje>`

## Sintaksa

### Splošno

- Za večino znanih tipov datotek za enotno formatiranje skrbi kombinacija ESLint-a in Prettier-ja. Kljub temu je spodaj navedenih nekaj splošnih smernic, ki jih upoštevajmo na splošno, v vseh datotekah.
- Za integracijo zgoraj navedenih orodij v VS Code in poenastavitev workflowa vam lahko pomaga Luka
- Če ne uporabljate integracije teh orodij v text editor, pred vsakim git commitom poženite `npm run format`
- Če se bo v git repozitorij začela objavljati neformatirana koda, bomo morali uporabiti git hooke; najraje na klientovi strani, sicer na strežniški

#### Splošne smernice

- Zamik enega nivoja naj bo povsod 2 presledka (JS, CSS, Pug, ...)
- Datoteke naj se končajo z newlinom.
- Komentarji se povedi. Začnejo se z veliko začetnico in končajo z ločilom.

### JS

- smernice in oblikovanje temeljijo na [JavaScript Standard Stilu](https://standardjs.com) z dodatnimi dopolnitvami
- uporaba console metod (log, warn, error, ...) v _končni_ kodi ni dovoljena
  - ker je končnemu uporabniku (na klientovi strani) neuporabna in lahko kvečjemu razkrije neželene detajle
  - ker je sinhrona in zato neprimerna za strežniško stran (Node)
  - za debugiranje lahko uporabljamo debug modul ali log pointe debuggerskega orodja. V skrajnem primeru lahko uporabite console metode, a jih pred git commitom odstranite
