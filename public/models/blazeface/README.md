# BlazeFace model assets

TensorFlow's BlazeFace TF.js default model, version 1. Downloaded without
modification from the TensorFlow publisher's Kaggle model distribution:

- Model card: https://www.kaggle.com/models/tensorflow/blazeface/tfJs/default/1
- Distribution: https://www.kaggle.com/api/v1/models/tensorflow/blazeface/tfJs/default/1/download

These assets are served from the application origin. Loading the face model
does not require relaxing the production Content Security Policy or connecting
the candidate's browser to an external model host. Face inference runs locally
in the browser; evidence screenshots use the existing authenticated endpoint.

Face observations are review signals, not proof of cheating or identity.

SHA-256 checksums:

- model.json: `7b6bb6f35e5a7899232de51dda8bf514ef9664ca7ec58388c9fecc088c883b58`
- group1-shard1of1.bin: `60b481ab6c19352673cdb21e02e639f90883db1393ac52d07c7ea4e1e11cb2cd`
