# coding:utf8
import os

from codec import Codec, RawEncoder, RawDecoder


class FileOutput:
    def __init__(self, filename, codec=Codec(RawEncoder(), RawDecoder())):
        self.filename = filename
        self.codec = codec
        pass

    def _mkdir(self):
        path = os.path.dirname(self.filename)
        if path.strip() == '':
            return
        if not os.path.exists(path):
            os.makedirs(path)

    def output(self, content):
        self._mkdir()
        with open(self.filename, "w") as out:
            decode = self.codec.decode
            encode = self.codec.encode
            out.write(encode(decode(content)))
