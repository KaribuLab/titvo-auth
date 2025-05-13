# TitVO Auth

Sistema de autenticación y gestión de API Keys para servicios de TitVO.

## Descripción

Este proyecto proporciona un servicio de autenticación y gestión de API Keys para las diferentes aplicaciones y servicios del ecosistema TitVO. Permite la autenticación segura, gestión de permisos y control de acceso a las APIs.

## Características

- Gestión de API Keys
- Autenticación de usuarios
- Control de acceso basado en roles
- Integración con AWS DynamoDB

## Requisitos

- Node.js (versión 18 o superior)
- AWS CLI configurado (para desarrollo local)
- TypeScript

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/yourusername/titvo-auth.git
cd titvo-auth

# Instalar dependencias
npm install

# Compilar el proyecto
npm run build
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```
AWS_REGION=us-east-1
AWS_STAGE=dev
AWS_ENDPOINT=http://localhost:8000
TABLE_NAME=ApiKeys
```

## Uso

```bash
# Iniciar el servidor de desarrollo
npm run dev

# Ejecutar pruebas
npm test

# Compilar para producción
npm run build
```

## Estructura del Proyecto

```
src/
├── app/           # Lógica de aplicación y casos de uso
├── core/          # Lógica de negocio y entidades
├── infrastructure/ # Implementaciones concretas (repositorios, APIs)
└── index.ts       # Punto de entrada de la aplicación
```

## Licencia

Este proyecto está licenciado bajo la [Licencia Apache 2.0](LICENSE). 