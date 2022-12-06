_Tale dokument se bo dopolnjeval in bo v končni obliki v angleščini_

# Navodila za zagon aplikacije v razvojnem okolju

**Na sistemu potrebuješ imeti naložen Docker.**

1. Z Git repozitorija https://git.amebis.si/TerminoloskiPortal.git preneseš (najnovejšo) kodo (git clone, git pull, ...).

2. `/dev/.env` skopiraš en nivo višje, v koren projekta, in po želji prilagodiš vrednosti.

3. Za zagon celotne aplikacije v terminalu v korenu projekta poženeš `docker-compose up`

4. Za ustavitev zgolj zapreš proces.

**Dodatno**

- Za vsak nadaljni zagon uporabljaš `docker-compose up`.

- Ob spremembi _node modulov_ je najprej treba pognati `docker-compose down`, nato pa `docker-compose up --build`.

- Če kadarkoli želiš sprostiti disk oz. ponastaviti aplikacijo, uporabiš `docker-compose down`. Podatki iz baze se ohranijo. Za izbris tudi njih, poženi raje `docker-compose down --volumes`.

- Ob razvoju upoštevaj razvojne konvencije, navedene v `dev/razvojne_konvencije.md`

- Odjemalec elektronske pošte je privzeto dosegljiv na portu 3001 (nastavljivo z variablo MAILDEV_WEB_GUI_PORT)
