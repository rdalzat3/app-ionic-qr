import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AlertController, LoadingController, ModalController, Platform, ToastController } from '@ionic/angular';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  segment = 'scan';
  qrText = '';
  scanResult = '';

  constructor(
    private loadingController: LoadingController,
    private platform: Platform,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  ngOnInit(): void {
    if (this.platform.is('capacitor')) {
      BarcodeScanner.isSupported().then();
      BarcodeScanner.checkPermissions().then();
      BarcodeScanner.removeAllListeners().then();
    }
  }

  /** Inicia scaneo */

  async startScan() {
    const modal = await this.modalController.create({
      component: BarcodeScanningModalComponent,
      cssClass: 'barcode-scanning-modal',
      showBackdrop: false,
      componentProps: {
        formats: [],
        lensFaceing: LensFacing.Back
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      this.scanResult = data?.barcode?.displayValue;
    }

  }

  /** Leer imagen qr */
  async readBarcodeFromImage() {

    const { files } = await FilePicker.pickImages({ multiple: false });

    const path = files[0]?.path;

    if (!path) return;

    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path: path,
      formats: []
    })

    this.scanResult = barcodes[0].displayValue;
  }

  // capturar imagen

  captureScreen() {
    const element = document.getElementById('qrImage') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {

      this.downloadImage(canvas);

      if (this.platform.is('capacitor'))
        this.shareImage(canvas);
      else
        this.downloadImage(canvas);

    })
  }

  //descargar imagen web

  downloadImage(canvas: HTMLCanvasElement) {

    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'qr.png';
    link.click();

  }

  //descargar imagen movil

  async shareImage(canvas: HTMLCanvasElement) {

    let base64 = canvas.toDataURL();
    let path = 'qr.png';


    const loading = await this.loadingController.create({ spinner: 'crescent' });

    await loading.present();


    await Filesystem.writeFile({
      path: path,
      data: base64,
      directory: Directory.Cache,
    }).then(async (res) => {

      let uri = res.uri;

      await Share.share({ url: uri });

      await Filesystem.deleteFile({
        path: path,
        directory: Directory.Cache,
      })

    }).finally(() => {
      loading.dismiss();
    })

  }

  /** copiar scanResult*/

  writeToClipboard = async () => {
    await Clipboard.write({
      string: this.scanResult
    });

    const toast = await this.toastController.create({
      message: 'Información copiada.',
      duration: 1000,
      color: 'tertiary',
      icon: 'clipboard-outline',
      position: 'middle'
    });
    toast.present();

  };

  /** Valida si el resultado del scan es url */
  isUrl() {
    let regex = /\.(com|net|io|me|crypto|ai)\b/i;
    return regex.test(this.scanResult);
  };


  openCapacitorSite = async () => {

    const alert = await this.alertController.create({
      header: 'Confirmar!',
      message: 'Quieres abrir la URL?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        }, {
          text: 'Si',
          handler: async() => {

            let url = this.scanResult;

            if (!['https://'].includes(this.scanResult))
              url = 'https://' + this.scanResult;
            await Browser.open({ url });
          
          }
        }
      ]
    });

    await alert.present();


  };

}



