# Ring Lab — コーヒーリング解析

写真上の測定線、またはImageJのプロファイルCSVから外周と中央の輝度を比較するWebアプリです。アカウント登録は不要です。選択した写真・CSVはブラウザ内だけで処理され、サーバーへ送信されません。

## 使い方
1. 「写真・CSVを開く」でJPEG、PNG、WebPまたはCSVを選択します。
2. 写真では、対象の滴を横切る測定線をドラッグして指定します。指定した平均範囲が収まる余白を確保してください。座標欄でも調整できます。
3. 外周を修正する場合は「外周位置の指定」を「手動」にして、左右の位置を写真のクリックまたは距離入力で指定します。
4. 各測定位置の「−側」「＋側」を別々に1 px刻みで調整します。−はA方向、＋はB方向です。−20／＋5は26点、両方0は1点です。
5. 結果CSV・プロファイルCSVを保存します。結果CSVには指定方法・各測定位置の−側・＋側の幅・範囲の両端が記録されます。

## 計算
- 測定線の最初と最後の1/3から、それぞれ最小輝度を検出。同値の場合は始点に近い点を採用します。
- 自動の最小点または手動指定位置を中心に、左右別の設定範囲を平均し、I left / I right とします。初期値は±15 px（幅30 px、両端を含む31点）。−m／＋n pxはm+n+1点です。
- 測定線・ファイルを変更すると手動位置は自動に戻ります。平均範囲の設定は保持します。
- I edge = (I left + I right) / 2。
- I center = 測定線の40〜60%の輝度平均。
- K = 100 × (1 − I edge / I center)。Kは物質量やリングの強さを直接測るものではありません。
- 平均窓が欠ける場合、部分平均を表示しKは計算しません。中央寄りの最小点は確認の目安を表示します。
- CSVは1 px刻みの `Distance_(pixels),Gray_Value` 形式。
- 写真のプロファイル計算はFiji / ImageJ 1.54pの `ProfilePlot.getProfile()` に合わせています。直線・線幅1・未校正の画素が対象です。RGBのまま／8-bit変換後、単純平均／加重平均、補間あり／なしを選択できます。
- 線長を四捨五入した区間数で両端までサンプリングし、RGB画素値のfloat丸め・8-bit変換の整数丸めも再現します。距離軸はFijiと同じ0, 1, 2,…で、斜め線の実際の点間距離は厳密な1 pxではありません。
- 同じ画素配列を入力した独立検証：Fiji本体1.54pと72プロファイル・11,696点を比較し、最大絶対誤差0。水平・垂直・斜め・逆向き・小数座標・画像端、4変換方法×補間ON/OFFを含みます。
- JPEGデコード・色管理・画像の向きはブラウザとFijiで異なる場合があるため、同じファイル名だけでは一致を保証しません。厳密な再現にはFijiのCSVを利用してください。FijiのPlot表示/CSV自体のfloat変換や小数桁数でも差が出ます。
- 太い線・曲線・16/32-bit・独自RGB重み・校正値には未対応。I edge / I center / Kは本アプリ独自の追加計算です。
- 参照実装：[ImageProcessor](https://imagej.net/ij/developer/source/ij/process/ImageProcessor.java.html)、[ColorProcessor](https://imagej.net/ij/developer/source/ij/process/ColorProcessor.java.html)、[ProfilePlot](https://imagej.net/ij/developer/source/ij/gui/ProfilePlot.java.html)。

## 公開・起動
GitHub Pages: Settings → Pages → Deploy from a branch → main / (root)。
ローカル確認: `python3 -m http.server 8766 --bind 127.0.0.1` をこのフォルダで実行し、http://localhost:8766/ を開きます。

写真・実験データ・認証情報はこの公開パッケージに含まれません。
