package com.prime.workout;

import android.os.CancellationSignal;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Google web client ID is not configured.");
            return;
        }

        GetSignInWithGoogleOption googleOption =
            new GetSignInWithGoogleOption.Builder(serverClientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build();
        CredentialManager manager = CredentialManager.create(getContext());

        manager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(@NonNull GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    if (!(credential instanceof CustomCredential)) {
                        call.reject("Google returned an unsupported credential.");
                        return;
                    }
                    CustomCredential custom = (CustomCredential) credential;
                    if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(
                        custom.getType()
                    )) {
                        call.reject("Google returned an unsupported credential.");
                        return;
                    }

                    try {
                        GoogleIdTokenCredential googleCredential =
                            GoogleIdTokenCredential.createFrom(custom.getData());
                        JSObject response = new JSObject();
                        response.put("credential", googleCredential.getIdToken());
                        call.resolve(response);
                    } catch (Exception error) {
                        call.reject("Google credential could not be read.", error);
                    }
                }

                @Override
                public void onError(@NonNull GetCredentialException error) {
                    call.reject("Google login was cancelled or unavailable.", error);
                }
            }
        );
    }
}
