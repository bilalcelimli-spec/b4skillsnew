package com.b4skills.b4native

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Android counterpart of the Apple Keychain / photo vault: values are AES-GCM encrypted with a
 * non-exportable Android Keystore key and written under noBackupFilesDir (never backed up).
 * Same contract as Apple: read returns null when nothing is stored; a value that cannot be
 * decrypted is an error, not silently dropped, so queued exam evidence is never lost unnoticed.
 */
class B4Vault(private val context: Context, private val folder: String, private val alias: String) {
  companion object {
    private const val KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORM = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128
  }

  private fun key(): SecretKey {
    val store = KeyStore.getInstance(KEYSTORE).apply { load(null) }
    (store.getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
    generator.init(
        KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build())
    return generator.generateKey()
  }

  private fun file(name: String): File {
    val dir = File(context.noBackupFilesDir, folder).apply { mkdirs() }
    val digest = MessageDigest.getInstance("SHA-256").digest(name.toByteArray()).joinToString("") { "%02x".format(it) }
    return File(dir, digest)
  }

  @Synchronized fun read(name: String): String? {
    val target = file(name)
    if (!target.exists()) return null
    val payload = target.readBytes()
    require(payload.size > IV_BYTES) { "Şifreli kayıt bozuk." }
    val cipher = Cipher.getInstance(TRANSFORM)
    cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, payload, 0, IV_BYTES))
    cipher.updateAAD(name.toByteArray())
    return String(cipher.doFinal(payload, IV_BYTES, payload.size - IV_BYTES), Charsets.UTF_8)
  }

  @Synchronized fun write(name: String, value: String) {
    val cipher = Cipher.getInstance(TRANSFORM)
    cipher.init(Cipher.ENCRYPT_MODE, key())
    cipher.updateAAD(name.toByteArray())
    val sealed = cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    // Write-then-rename so a crash never leaves a half-written queue behind.
    val target = file(name)
    val temp = File(target.parentFile, target.name + ".tmp")
    temp.writeBytes(sealed)
    if (!temp.renameTo(target)) { target.delete(); check(temp.renameTo(target)) { "Kayıt yazılamadı." } }
  }
}
