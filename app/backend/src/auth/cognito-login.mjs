// src/auth/cognito-login.mjs
import crypto from "node:crypto";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.COGNITO_REGION;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || null;

const cip = new CognitoIdentityProviderClient({ region: REGION });

function secretHash(username) {
    if (!CLIENT_SECRET) return null;
    return crypto
        .createHmac("sha256", CLIENT_SECRET)
        .update(username + CLIENT_ID)
        .digest("base64");
}

export async function cognitoAuthenticate(email, password) {
    const Username = String(email ?? "").trim().toLowerCase();
    const Password = String(password ?? "").trim();

    if (!Username || !Password) throw new Error("Email y password requeridos");

    const AuthParameters = { USERNAME: Username, PASSWORD: Password };
    const sh = secretHash(Username);
    if (sh) AuthParameters.SECRET_HASH = sh;

    const out = await cip.send(
        new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: CLIENT_ID,
            AuthParameters,
        })
    );

    const ar = out?.AuthenticationResult;
    if (!ar?.IdToken || !ar?.AccessToken) throw new Error("Cognito no retornó tokens");

    // Para NO modificar front, puedes seguir retornando { token: ... }
    return {
        token: ar.AccessToken,      // 👈 compatibilidad con tu front: token = access
        accessToken: ar.AccessToken,
        idToken: ar.IdToken,
        refreshToken: ar.RefreshToken,
        expiresIn: ar.ExpiresIn,
        tokenType: ar.TokenType,
    };

}
