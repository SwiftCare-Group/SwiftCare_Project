package com.swiftcare.consultation_service.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
public class QRCodeService {

    /**
     * Generates a QR code from prescription data
     * Returns it as a Base64 string (like a photo encoded as text)
     *
     * Think of it like this:
     * - You give it the prescription details
     * - It prints a QR code
     * - It converts that QR code into a text string
     * - That string can be sent to the phone app
     * - The phone app converts it back into a scannable image
     */
    public String generateQRCode(String prescriptionData) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();

            // Create the QR code matrix (the actual pattern of black/white squares)
            BitMatrix bitMatrix = qrCodeWriter.encode(
                    prescriptionData,
                    BarcodeFormat.QR_CODE,
                    300,  // width in pixels
                    300   // height in pixels
            );

            // Convert the matrix to an image
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            // Convert image to Base64 text string
            byte[] imageBytes = outputStream.toByteArray();
            return Base64.getEncoder().encodeToString(imageBytes);

        } catch (WriterException | java.io.IOException e) {
            System.out.println("QR Code generation error: " + e.getMessage());
            return null;
        }
    }

    /**
     * Builds the prescription data string that goes INTO the QR code
     * This is what the pharmacist sees when they scan it
     */
    public String buildPrescriptionData(Long prescriptionId,
                                        Long patientId,
                                        Long doctorId,
                                        String drugs) {
        return "SWIFTCARE-PRESCRIPTION" +
                "|ID:" + prescriptionId +
                "|PATIENT:" + patientId +
                "|DOCTOR:" + doctorId +
                "|DRUGS:" + drugs +
                "|VERIFY:swiftcare.app/verify/" + prescriptionId;
    }
}