// src/auth/cognito-signup.mjs
import crypto from "node:crypto";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  AdminAddUserToGroupCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || null;

if (!REGION || !USER_POOL_ID || !CLIENT_ID) {
  throw new Error(
    "Faltan envs Cognito: COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID"
  );
}

// Si tu App Client tiene secret habilitado, este debe existir en backend.
// Si no quieres obligarlo, comenta este bloque.
if (!CLIENT_SECRET) {
  throw new Error(
    "Falta COGNITO_CLIENT_SECRET (tu App Client tiene secret habilitado; Cognito pedirá SecretHash)"
  );
}

const cip = new CognitoIdentityProviderClient({ region: REGION });

function secretHash(username) {
  // CLIENT_SECRET es obligatorio arriba, pero lo dejamos igual por seguridad
  if (!CLIENT_SECRET) return null;
  return crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password ?? "").trim();
}

function normalizeGroup(groupName) {
  const g = String(groupName ?? "cliente").trim().toLowerCase();
  const allowed = new Set(["cliente", "admin"]);
  if (!allowed.has(g)) throw new Error("Grupo inválido (solo: cliente | admin)");
  return g;
}

function isMissingAwsCredsError(e) {
  const msg = String(e?.message ?? "");
  // Mensajes típicos del SDK cuando no hay credenciales o no puede resolverlas
  return (
    e?.name === "CredentialsProviderError" ||
    msg.includes("Could not load credentials") ||
    msg.includes("Missing credentials") ||
    msg.includes("credentials") && msg.includes("could not")
  );
}

function mapCognitoError(e) {
  if (!e) return new Error("Error desconocido");

  // Mensajes amigables
  if (e.name === "UsernameExistsException") {
    return new Error("El correo ya está registrado");
  }
  if (e.name === "InvalidPasswordException") {
    return new Error("La contraseña no cumple la política del sistema");
  }
  if (e.name === "InvalidParameterException") {
    return new Error("Parámetros inválidos (revisa email/password)");
  }
  if (e.name === "NotAuthorizedException") {
    // Por ejemplo secret hash malo, etc.
    return new Error(e.message || "No autorizado");
  }

  return e instanceof Error ? e : new Error(String(e));
}

export async function cognitoSignUp({
  email,
  password,
  groupName = "cliente",
  autoConfirm = true,
  markEmailVerified = true,
}) {
  const Username = normalizeEmail(email);
  const Password = normalizePassword(password);
  const GroupName = normalizeGroup(groupName);

  if (!Username || !Password) throw new Error("Email y password requeridos");

  const input = {
    ClientId: CLIENT_ID,
    Username,
    Password,
    UserAttributes: [{ Name: "email", Value: Username }],
  };

  const sh = secretHash(Username);
  if (sh) input.SecretHash = sh;

  let out;
  try {
    out = await cip.send(new SignUpCommand(input));
  } catch (e) {
    throw mapCognitoError(e);
  }

  // Admin ops (requieren credenciales IAM válidas en tu backend)
  if (autoConfirm) {
    try {
      await cip.send(
        new AdminConfirmSignUpCommand({
          UserPoolId: USER_POOL_ID,
          Username,
        })
      );

      if (markEmailVerified) {
        await cip.send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: USER_POOL_ID,
            Username,
            UserAttributes: [{ Name: "email_verified", Value: "true" }],
          })
        );
      }
    } catch (e) {
      if (isMissingAwsCredsError(e)) {
        throw new Error(
          "No pude auto-confirmar: el backend no tiene credenciales AWS (IAM) configuradas"
        );
      }
      if (e?.name === "AccessDeniedException") {
        throw new Error(
          "No pude auto-confirmar: falta permiso IAM para AdminConfirmSignUp/AdminUpdateUserAttributes"
        );
      }
      throw mapCognitoError(e);
    }
  }

  // Grupo/rol
  if (GroupName) {
    try {
      await cip.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username,
          GroupName: GroupName,
        })
      );
    } catch (e) {
      if (isMissingAwsCredsError(e)) {
        throw new Error(
          "No pude asignar grupo: el backend no tiene credenciales AWS (IAM) configuradas"
        );
      }
      if (e?.name === "AccessDeniedException") {
        throw new Error(
          "No pude asignar grupo: falta permiso IAM para AdminAddUserToGroup"
        );
      }
      throw mapCognitoError(e);
    }
  }

  return {
    sub: out?.UserSub,
    userConfirmed: !!autoConfirm,
  };
}

export async function cognitoConfirmSignUp({ email, code }) {
  const Username = normalizeEmail(email);
  const ConfirmationCode = String(code ?? "").trim();

  if (!Username || !ConfirmationCode) throw new Error("Email y code requeridos");

  const input = { ClientId: CLIENT_ID, Username, ConfirmationCode };
  const sh = secretHash(Username);
  if (sh) input.SecretHash = sh;

  try {
    await cip.send(new ConfirmSignUpCommand(input));
    return { ok: true };
  } catch (e) {
    throw mapCognitoError(e);
  }
}

export async function cognitoResendCode({ email }) {
  const Username = normalizeEmail(email);
  if (!Username) throw new Error("Email requerido");

  const input = { ClientId: CLIENT_ID, Username };
  const sh = secretHash(Username);
  if (sh) input.SecretHash = sh;

  try {
    await cip.send(new ResendConfirmationCodeCommand(input));
    return { ok: true };
  } catch (e) {
    throw mapCognitoError(e);
  }
}
