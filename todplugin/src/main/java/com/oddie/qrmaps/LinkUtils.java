package com.oddie.qrmaps;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.Hashtable;

public final class LinkUtils {
  public static String shortenURL(final String url) throws IOException, InterruptedException {
    // Maybe later....
    return url;
  }

  public static BufferedImage createQRCode(final String url, final int size) throws WriterException {
    Hashtable<EncodeHintType, ErrorCorrectionLevel> hintMap = new Hashtable<>();
    hintMap.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.L);

    QRCodeWriter writer = new QRCodeWriter();
    BitMatrix bitMatrix = writer.encode(url, BarcodeFormat.QR_CODE, size, size, hintMap);

    int matrixSize = bitMatrix.getWidth();
    BufferedImage image = new BufferedImage(matrixSize, matrixSize, BufferedImage.TYPE_INT_RGB);
    image.createGraphics();

    Graphics2D graphics = (Graphics2D) image.getGraphics();
    graphics.setColor(Color.WHITE);
    graphics.fillRect(0, 0, matrixSize, matrixSize);

    graphics.setColor(Color.BLACK);
    for (int x = 0; x < matrixSize; x++) {
      for (int y = 0; y < matrixSize; y++) {
        if (bitMatrix.get(x, y)) {
          graphics.fillRect(x, y, 1, 1);
        }
      }
    }

    return image;
  }
}
