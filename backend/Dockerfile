FROM golang:1.26-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o syncpad ./cmd/server

FROM alpine:latest

WORKDIR /app
COPY --from=build /app/syncpad .

ENV PORT=3000
EXPOSE ${PORT}

CMD ["./syncpad"]