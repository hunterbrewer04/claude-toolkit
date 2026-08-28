struct Label {
    let text: String
    let widthMM: Int

    func render() -> String {
        "^XA^FO50,50^FD\(text)^FS^XZ"
    }
}
