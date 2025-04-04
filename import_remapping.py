from pathlib import Path
from shutil import rmtree, copytree

root_path = Path.cwd() / "contracts" / "external" / "neon-contracts"
node_modules_path = root_path / "node_modules"
pyth_path = root_path / "contracts" / "oracles" / "Pyth"
destination =  root_path / "contracts" / "oz" / "contracts"

copytree(node_modules_path / "@openzeppelin" / "contracts", destination, dirs_exist_ok=True)
rmtree(pyth_path)
rmtree(node_modules_path)

replacements = [(b'@openzeppelin', b'../../oz'),]
globpath = './contracts/external/neon-contracts/contracts/**/*.sol'

import glob
for filepath in glob.iglob(globpath, recursive=True):
    with open(filepath, 'rb') as file:
        s = file.read()
    for f, r in replacements:
        s = s.replace(f, r)
    with open(filepath, "wb") as file:
        file.write(s)


uniswap_str_util_path = Path.cwd() / "node_modules" / "@uniswap" / "lib" / "contracts" / "libraries" / "AddressStringUtil.sol"

replacements = [(b'pragma solidity >=0.5.0;', b'pragma solidity >=0.5.0 <0.8.0;'),]
with open(uniswap_str_util_path, 'rb') as file:
    s = file.read()
    print(file.name)
for f, r in replacements:
    s = s.replace(f, r)
with open(uniswap_str_util_path, "wb") as file:
    file.write(s)