FROM alpine:3.16 AS builder
WORKDIR /sloleks
RUN wget -qO- "https://www.clarin.si/repository/xmlui/bitstream/handle/11356/1230/Sloleks2.0.LMF.zip?sequence=3&isAllowed=y" | unzip -

FROM ghcr.io/clarinsi/rsdo-concordancer-api:v1.0.4
COPY --from=builder /sloleks /sloleks
