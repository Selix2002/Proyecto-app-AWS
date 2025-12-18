// src/auth/cognito-signup.mjs
import crypto from "node:crypto";
import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || null;

if (!REGION || !USER_POOL_ID || !CLIENT_ID) {
    throw new Error("Faltan envs Cognito: COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID");
}

const cip = new CognitoIdentityProviderClient({ region: REGION });

function secretHash(username) {
    if (!CLIENT_SECRET) return null;
    return crypto.createHmac("sha256", CLIENT_SECRET).update(username + CLIENT_ID).digest("base64");
}

export async function cognitoSignUp({ email, password, groupName = "cliente" }) {
    const Username = String(email ?? "").trim().toLowerCase();
    const Password = String(password ?? "").trim();
    if (!Username || !Password) throw new Error("Email y password requeridos");

    const input = {
        ClientId: CLIENT_ID,
        Username,
        Password,
        UserAttributes: [
            { Name: "email", Value: Username },
            // Si en tu pool el email se verifica, Cognito enviará código automáticamente.
        ],
    };

    const sh = secretHash(Username);
    if (sh) input.SecretHash = sh;

    const out = await cip.send(new SignUpCommand(input));

    // Si quieres manejar roles por grupos, asigna el grupo acá (requiere credenciales AWS con permisos)
    // OJO: para que salga en el token, el usuario debe iniciar sesión después de estar en el grupo.
    if (groupName) {
        await cip.send(
            new AdminAddUserToGroupCommand({
                UserPoolId: USER_POOL_ID,
                Username,
                GroupName: groupName,
            })
        );
    }

    return {
        sub: out.UserSub,                 // <- este es el userId real
        userConfirmed: !!out.UserConfirmed,
    };
}

export async function cognitoConfirmSignUp({ email, code }) {
    const Username = String(email ?? "").trim().toLowerCase();
    const ConfirmationCode = String(code ?? "").trim();
    if (!Username || !ConfirmationCode) throw new Error("Email y code requeridos");

    const input = { ClientId: CLIENT_ID, Username, ConfirmationCode };
    const sh = secretHash(Username);
    if (sh) input.SecretHash = sh;

    await cip.send(new ConfirmSignUpCommand(input));
    return { ok: true };
}

export async function cognitoResendCode({ email }) {
    const Username = String(email ?? "").trim().toLowerCase();
    if (!Username) throw new Error("Email requerido");

    const input = { ClientId: CLIENT_ID, Username };
    const sh = secretHash(Username);
    if (sh) input.SecretHash = sh;

    await cip.send(new ResendConfirmationCodeCommand(input));
    return { ok: true };
}
