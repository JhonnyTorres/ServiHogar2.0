# 🏠 ServiHogar 2.0

> Plataforma móvil que conecta clientes con profesionales de servicios del hogar.

---

## 💡 Idea de Negocio

El mercado de servicios del hogar en Colombia carece de una plataforma digital confiable que conecte a clientes con profesionales de manera rápida y transparente.

**ServiHogar 2.0** busca solucionar esta necesidad mediante un marketplace móvil donde:

- Los **clientes** pueden buscar y solicitar servicios profesionales.
- Los **profesionales** pueden ofrecer sus servicios y gestionar las solicitudes recibidas.
- Los usuarios pueden interactuar de acuerdo con el rol asignado dentro de la aplicación.
- El sistema permite gestionar el proceso de solicitud y cotización de los servicios.
- Las actualizaciones de información permiten mantener informados a clientes y profesionales durante el proceso.

### Categorías de servicio disponibles

Plomería · Electricidad · Construcción · Pintura · Carpintería · Cerrajería · Jardinería · Limpieza · Gas · Climatización

---

## 📱 Capturas de Pantalla

### 🔐 Autenticación y acceso

| Inicio de sesión | Registro | Selección de rol |
|:---:|:---:|:---:|
| <img src="assets/Login.jpeg" width="250"> | <img src="assets/Register.jpeg" width="250"> | <img src="assets/RolSelection.jpeg" width="250"> |

La aplicación permite registrar usuarios, seleccionar el rol correspondiente e iniciar sesión mediante Firebase Authentication.

### 📧 Verificación de correo electrónico

Durante el proceso de autenticación se realiza la verificación de la cuenta mediante el envío de un correo electrónico al usuario registrado.

> **Evidencia:** verificación de correo electrónico mediante Firebase Authentication.

### 👤 Acceso según el tipo de usuario

La aplicación diferencia el flujo de navegación dependiendo del rol seleccionado.

| Splash Cliente | Splash Profesional |
|:---:|:---:|
| <img src="assets/SplashClient.jpeg" width="250"> | <img src="assets/SplashPro.jpeg" width="250"> |

### 🏠 Vistas principales

| Vista principal del cliente | Vista principal del profesional |
|:---:|:---:|
| <img src="assets/Home.jpeg" width="250"> | <img src="assets/HomeProfessional.jpeg" width="250"> |

Cada perfil dispone de una vista principal adaptada a las funciones correspondientes a su rol.

### 🔎 Servicios y profesionales

| Buscar profesionales | Mis servicios |
|:---:|:---:|
| <img src="assets/.jpeg" width="250"> | <img src="assets/ClientServicesScreen.jpeg" width="250"> |

### 💰 Gestión de cotizaciones

El profesional puede enviar una cotización al cliente como parte del proceso de atención de una solicitud de servicio.

La cotización enviada puede ser visualizada por el cliente dentro de la aplicación.

> **Evidencia:** envío de cotización desde el perfil profesional y recepción de la cotización por parte del cliente.

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| React Native + Expo | Framework principal de desarrollo móvil |
| Firebase Authentication | Autenticación y gestión de usuarios |
| Cloud Firestore | Base de datos en tiempo real |
| SQLite (`expo-sqlite`) | Persistencia local y almacenamiento de información |
| Cloudinary | Almacenamiento de imágenes de perfil |
| React Navigation | Navegación entre pantallas |
| Expo Notifications | Gestión de notificaciones |
| Expo Linear Gradient | Gradientes visuales en pantallas de autenticación |

---

## 🚀 Funcionalidades Implementadas

### 🔐 Autenticación

- [x] Registro de usuarios.
- [x] Registro con nombre, correo y contraseña.
- [x] Selección de rol: cliente / profesional.
- [x] Creación del perfil profesional.
- [x] Inicio de sesión.
- [x] Cierre de sesión.
- [x] Verificación de correo electrónico.
- [x] Navegación diferenciada según el rol del usuario.

### 👤 Cliente

- [x] Vista principal del cliente.
- [x] Acceso a categorías de servicios.
- [x] Búsqueda de profesionales por categoría.
- [x] Solicitud de servicios.
- [x] Confirmación de solicitudes.
- [x] Visualización de servicios.
- [x] Historial de servicios.
- [x] Visualización de cotizaciones enviadas por profesionales.
- [x] Calificación mediante estrellas y comentario.
- [x] Visualización de servicios rechazados.

### 👷 Profesional

- [x] Vista principal del profesional.
- [x] Visualización del estado del perfil.
- [x] Gestión de solicitudes recibidas.
- [x] Visualización de solicitudes en tiempo real.
- [x] Aceptación o rechazo de solicitudes.
- [x] Finalización de servicios.
- [x] Envío de cotizaciones al cliente.
- [x] Visualización del promedio de calificaciones.

### 💬 Comunicación y notificaciones

- [x] Gestión de información de usuarios mediante Firestore.
- [x] Gestión de notificaciones asociadas a eventos de la aplicación.
- [x] Actualización de información de usuarios en tiempo real.

### 👤 Perfil y configuración

- [x] Gestión de información del perfil.
- [x] Gestión de foto de perfil mediante Cloudinary.
- [x] Configuración de usuario.
- [x] Cierre de sesión.

### 💾 Persistencia local

- [x] Caché de servicios del cliente.
- [x] Historial de búsquedas recientes por categoría.
- [x] Registro de profesionales vistos recientemente.

---

## 📸 Evidencias de funcionamiento

Las evidencias de la aplicación incluyen los siguientes flujos:

### Flujo de autenticación

1. Registro del usuario.
2. Selección del rol.
3. Verificación del correo electrónico.
4. Inicio de sesión.
5. Redirección según el rol seleccionado.

### Flujo del cliente

1. Inicio de sesión como cliente.
2. Visualización de la pantalla principal.
3. Búsqueda de profesionales.
4. Gestión de servicios.
5. Recepción y visualización de cotizaciones.

### Flujo del profesional

1. Inicio de sesión como profesional.
2. Visualización de la pantalla principal.
3. Gestión de solicitudes.
4. Elaboración y envío de cotización al cliente.

---

## 📁 Estructura del Proyecto

```text
ServiHogar2.0/
├── navigation/
│   ├── AppNavigator.js
│   ├── AuthContext.js
│   └── AppProvider.js
│
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   ├── RoleSelectionScreen.js
│   │   │   └── ProfessionalProfileScreen.js
│   │   │
│   │   ├── HomeScreen.js
│   │   ├── SearchProfessionalsScreen.js
│   │   ├── ClientServicesScreen.js
│   │   ├── ProfessionalServicesScreen.js
│   │   ├── UserScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── SplashClientScreen.js
│   │   └── SplashProScreen.js
│   │
│   ├── services/
│   │   ├── firebaseService.js
│   │   ├── cloudinaryService.js
│   │   ├── sqliteService.js
│   │   ├── userService.js
│   │   ├── ChatService.js
│   │   └── NotificationService.js
│   │
│   └── constants/
│       └── colors.js
│
├── functions/
│   └── notificaciones.js
│
├── docs/
│   ├── ManualTecnico_ServiHogar.docx
│   └── ManualUsuario_ServiHogar.docx
│
├── assets/
├── App.js
├── package.json
└── README.md
## 👨‍💻 Autor

Desarrollado como proyecto de aula para la materia de **Desarrollo Móvil** — Universidad Católica Luis Amigó.
## 📸 Evidencias

